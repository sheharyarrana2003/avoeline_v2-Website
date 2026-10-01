import { notFound, redirect } from "next/navigation";
import { eventIsHackathon, listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { AssignLeftoverTeams } from "@/src/features/hackathon/components/AssignLeftoverTeams";
import { hackathonDashPath } from "@/src/features/hackathon/kinds";
import { AuthService } from "@/src/features/auth/authService";
import { AttendeeService, emptyAttendeeForUser, userFromRegistration } from "@/src/features/event_attendee/attendee.service";
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { EventService } from "@/src/services/event.service";
import { UserService } from "@/src/services/user.service";
import { Registration } from "@/src/services/models/reg.type";
import { getSignedUrl, CERTIFICATES_BUCKET } from "@/data/supabase";
import type { ExportResult } from "@/src/features/exports/types";
import { exportEventSheetAction } from "@/src/features/exports/actions/exportEventSheet.action";
import { promoteFromWaitlist } from "@/src/features/access/actions/registrationDecision.action";
import { maybeRevealHackathonAccessCodes } from "@/src/features/hackathon/accessCodes.service";
import { occupyingGroupRegs, occupyingHackathonRegs } from "@/src/features/registration/registration.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";

export default async function AttendeesPage({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;

    // Needed only for its access settings, which decide where a paid registration
    // lands once payment clears.
    const eventForAccess = await EventService.getEventByID(event_id);
    if (!eventForAccess) {
        notFound();
    }
    if (eventForAccess.requiresRegistration === false) {
        redirect(
            (await eventIsHackathon(eventForAccess))
                ? hackathonDashPath(eventForAccess.organizerId, event_id)
                : `/organizer/${eventForAccess.organizerId}/events/${event_id}`,
        );
    }

    const currentUser = await AuthService.getCurrentUser();
    const isPlatformAdmin = currentUser?.role === "platform_admin" || currentUser?.userType === "admin";
    const isOrganizer = currentUser?.userId === eventForAccess.organizerId;
    const isDepartmentAdmin = currentUser?.role === "department_admin" && (currentUser?.orgId === eventForAccess.organizerId || currentUser?.managedOrgIds?.includes(eventForAccess.organizerId));

    // Team leads and attendees are strictly prevented from viewing the full event attendee list
    if (!isPlatformAdmin && !isOrganizer && !isDepartmentAdmin) {
        redirect("/access-denied?reason=unauthorized_attendee_list");
    }

    // Drive the list off registrations, not attendee profiles: every registrant
    // must show up, whether or not they have an `attendees` profile doc.
    const regs = await RegService.getRegsOfEvent(event_id);

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

        await maybeRevealHackathonAccessCodes(registeration.registrationId);
    }

    // No padding and no event title here: the event layout renders both, and this
    // page's job is the Attendees section of it.
    // Bound here so the client never sees an event id it could swap; the action
    // re-checks ownership regardless.
    const handle_export = async () => {
        'use server'
        return exportEventSheetAction({ eventId: event_id, kind: "attendees", format: "xlsx" });
    };

    const isHackathon = await eventIsHackathon(eventForAccess);
    const groupRegistration = !isHackathon && !!eventForAccess.registration?.groupRegistration;
    const [hackTracks, hackTeams, regGroups] = await Promise.all([
        isHackathon ? listTracks(event_id) : Promise.resolve([]),
        isHackathon ? listTeamsOfEvent(event_id) : Promise.resolve([]),
        groupRegistration ? listRegistrationGroups(event_id) : Promise.resolve([]),
    ]);
    const teamedIds = new Set(hackTeams.flatMap((t) => t.members.map((m) => m.registrationId)));
    const leftover = attendeesWithUsers.filter((row) => !teamedIds.has(row.register.registrationId));
    const assignReturn = hackathonDashPath(eventForAccess.organizerId, event_id, "attendees");

    return (
        <AttendeeClientSide
            attendees={attendeesWithUsers}
            handle_reg_status={handle_reg_status}
            onExport={handle_export}
            occupyingCount={
                isHackathon
                    ? occupyingHackathonRegs(regs, hackTeams).length
                    : groupRegistration
                      ? occupyingGroupRegs(regs, regGroups).length
                      : undefined
            }
            defaultGrouped={isHackathon || groupRegistration}
            groups={
                groupRegistration
                    ? regGroups.map((g) => {
                          const members = attendeesWithUsers.filter((row) => g.memberIds.includes(row.register.registrationId));
                          const lead = members.find((m) => m.register.registrationId === g.leadRegistrationId) ?? members[0];
                          return {
                              id: g.id,
                              name: g.groupName,
                              members,
                              payment: lead?.register.payment?.paymentStatus ?? g.paymentStatus,
                              accessCode: undefined,
                          };
                      })
                    : undefined
            }
            requiresApproval={!!eventForAccess?.access?.requiresApproval}
            teams={
                isHackathon
                    ? hackTeams.map((t) => ({
                          id: t.id,
                          name: t.name,
                          trackName: hackTracks.find((tr) => tr.id === t.trackId)?.name ?? "Competition",
                          accessCode: t.accessCode,
                          memberIds: t.memberRegistrationIds,
                      }))
                    : undefined
            }
            extra={
                isHackathon ? (
                    <AssignLeftoverTeams
                        eventId={event_id}
                        returnTo={assignReturn}
                        leftover={leftover}
                        tracks={hackTracks.map((t) => ({ id: t.id, name: t.name, maxTeamSize: t.maxTeamSize }))}
                        teams={hackTeams.map((t) => ({
                            id: t.id,
                            name: t.name,
                            trackId: t.trackId,
                            size: t.members.length,
                            maxTeamSize: t.maxTeamSize,
                        }))}
                    />
                ) : null
            }
        />
    );
}
