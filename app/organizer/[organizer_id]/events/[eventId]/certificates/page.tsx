import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { CertificateService } from "@/src/services/certificate.service";
import { EventService } from "@/src/services/event.service";
import { AuthService } from "@/src/features/auth/authService";
import type { CertificateGenerationResult } from "@/src/services/models/certificate.model";
import CertificateIssuanceClient from "./certificateClient";
import { AttendeeCertProp } from "./certificateClient";

export default async function CertificateIssuancePage({
    params
}: {
    params: Promise<{ organizer_id: string; eventId: string }>
}) {
    const resolvedParams = await params;
    const { organizer_id, eventId } = resolvedParams;


    // Driven off registrations, not `attendees` profile documents: a profile only
    // exists for someone with an account, so public sign-ups (userId "") were
    // absent from this page entirely and could never be issued a certificate.
    const regs = await RegService.getRegsOfEvent(eventId);

    let attendeesWithData: AttendeeCertProp[] = [];
    if (regs.length) {
        const [usersById, certByRegistration] = await Promise.all([
            UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean)),
            CertificateService.getCertsOfEventByRegistration(eventId),
        ]);

        attendeesWithData = regs
            // A cancelled or rejected registration is not owed a certificate.
            .filter((r) => r.status !== "cancelled" && r.status !== "rejected")
            .map((r) => {
                const user = usersById.get(String(r.userId));
                return {
                    registrationId: r.registrationId,
                    // The account's name when there is one, the registration's
                    // own contact details when there is not.
                    name: user?.profile?.fullName || r.attendee?.name || "Attendee",
                    email: user?.email || r.attendee?.email || "",
                    checkedIn: !!r.checkIn?.checkedIn || r.status === "checked_in" || r.status === "attended",
                    certStatus: certByRegistration.get(r.registrationId) ?? null,
                };
            });
    }

    async function handleGenerateCertificates(
        selectedAttendeeIds: string[],
        roles: Record<string, string> = {},
    ): Promise<CertificateGenerationResult> {
        "use server";

        // A Server Action is a public endpoint, and this one spends money: the
        // default template has blockchain.enabled = true, so generating mints a
        // real on-chain certificate per attendee. Without these checks any
        // signed-in organizer could open another organizer's certificates URL --
        // organizer_id and eventId are closed over from the path, not verified --
        // and bill them for a batch of mints on an event they do not own.
        const current = await AuthService.getCurrentUser();
        const refuse = (message: string): CertificateGenerationResult => ({
            success: false, count: 0, failedCount: 0, message, results: [],
        });

        if (!current?.userId) return refuse("Please sign in again.");
        if (String(current.userType).toLowerCase() !== "organizer") {
            return refuse("Only organizers can issue certificates.");
        }
        if (current.userId !== organizer_id) return refuse("You cannot issue certificates for another organizer.");

        const target = await EventService.getEventByID(eventId);
        if (!target) return refuse("That event no longer exists.");
        if (String(target.organizerId) !== current.userId) {
            return refuse("You cannot issue certificates for an event you do not own.");
        }

        const selected = attendeesWithData
            .filter((item) => selectedAttendeeIds.includes(item.registrationId))
            .map((item) => item.registrationId);

        return CertificateService.generateCertificatesForEvent(eventId, organizer_id, selected, roles);
    }

   
    return (
        <CertificateIssuanceClient
            attendees={attendeesWithData}
            eventId={eventId}
            onGenerateCertificates={handleGenerateCertificates}
        />
    );
}
