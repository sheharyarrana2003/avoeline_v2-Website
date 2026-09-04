import { AttendeeService, emptyAttendeeForUser, userFromRegistration } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { EventService } from "@/src/services/event.service";
import { UserService } from "@/src/services/user.service";
import { Registration } from "@/src/services/models/reg.type";
import { getSignedUrl, CERTIFICATES_BUCKET } from "@/data/supabase";
import type { ExportResult } from "@/src/features/exports/types";
import { exportEventSheetAction } from "@/src/features/exports/actions/exportEventSheet.action";
import { promoteFromWaitlist } from "@/src/features/access/actions/registrationDecision.action";

export default async function AttendeesPage({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;

    // Drive the list off registrations, not attendee profiles: every registrant
    // must show up, whether or not they have an `attendees` profile doc.
    const regs = await RegService.getRegsOfEvent(event_id);
    // Needed only for its access settings, which decide where a paid registration
    // lands once payment clears.
    const eventForAccess = await EventService.getEventByID(event_id);

    let attendeesWithUsers: AttendeeClientSideProp[] = [];
    if (regs.length) {
        const userIds = regs.map(r => r.userId).filter(Boolean);
        const [usersById, attendeesByUser] = await Promise.all([
            UserService.getUsersByIds(userIds),
            AttendeeService.getAttendeeProfilesByUserIds(userIds),
        ]);

        // Signed here, once per render, because the proofs bucket is private. Failures
        // resolve to null so one unreachable screenshot cannot take down the list.
        const proofUrls = new Map<string, string>(
            (
                await Promise.all(
                    regs
                        .filter(r => r.payment?.proofPath)
                        .map(async r => {
                            try {
                                return [r.registrationId, await getSignedUrl(CERTIFICATES_BUCKET, r.payment.proofPath!)] as const;
                            } catch (err) {
                                console.error("[attendees] could not sign payment proof", { id: r.registrationId, err });
                                return null;
                            }
                        }),
                )
            ).filter((entry): entry is readonly [string, string] => entry !== null),
        );

        attendeesWithUsers = regs.map(register => ({
            a: attendeesByUser.get(String(register.userId)) ?? emptyAttendeeForUser(String(register.userId)),
            // No `!` here: a public registration has no account to find, and a
            // deleted user resolves to nothing either. Both used to hand the list
            // `undefined` and crash it on the first property access.
            user: usersById.get(String(register.userId)) ?? userFromRegistration(register),
            register,
            proofUrl: proofUrls.get(register.registrationId) ?? null,
        }));
    }

    const handle_reg_status = async (registeration: Registration) => {
        'use server'
        await RegService.updateReg(registeration)

        // Cancelling or rejecting releases a seat, and there are no background
        // jobs here, so promotion has to be a consequence of the write that made
        // room. Never throws -- a failed promotion must not look like a failed
        // status change.
        if (registeration.status === "cancelled" || registeration.status === "rejected") {
            await promoteFromWaitlist(event_id);
        }
    }

    // No padding and no event title here: the event layout renders both, and this
    // page's job is the Attendees section of it.
    // Bound here so the client never sees an event id it could swap; the action
    // re-checks ownership regardless.
    const handle_export = async () => {
        'use server'
        return exportEventSheetAction({ eventId: event_id, kind: "attendees", format: "xlsx" });
    };

    return (
        <AttendeeClientSide
            attendees={attendeesWithUsers}
            handle_reg_status={handle_reg_status}
            onExport={handle_export}
            requiresApproval={!!eventForAccess?.access?.requiresApproval}
        />
    );
}
