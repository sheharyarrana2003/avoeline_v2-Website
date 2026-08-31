import { AttendeeService } from "@/src/features/event_attendee/attendee.service";
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


    const attendee = await AttendeeService.getAttendeeOfEvent(eventId);
    const attendeeList = attendee ?? [];

    let attendeesWithData: AttendeeCertProp[] = [];
    if (attendeeList.length) {
        // Two batched reads for the whole list instead of 2 reads per attendee.
        const [usersById, certByUser] = await Promise.all([
            UserService.getUsersByIds(attendeeList.map(a => a.userId)),
            CertificateService.getCertsOfEventByUser(eventId),
        ]);

        attendeesWithData = attendeeList.map(a => ({
            a,
            user: usersById.get(String(a.userId))!,
            certStatus: certByUser.get(String(a.userId)) ?? null,
        }));
    }

    async function handleGenerateCertificates(selectedAttendeeIds: string[]): Promise<CertificateGenerationResult> {
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

        const selectedUserIds = attendeesWithData
            .filter((item) => selectedAttendeeIds.includes(item.a.attendeeId))
            .map((item) => String(item.a.userId));

        return CertificateService.generateCertificatesForEvent(eventId, organizer_id, selectedUserIds);
    }

   
    return (
        <CertificateIssuanceClient
            attendees={attendeesWithData}
            eventId={eventId}
            onGenerateCertificates={handleGenerateCertificates}
        />
    );
}
