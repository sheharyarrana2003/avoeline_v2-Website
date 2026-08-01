import { AttendeeService } from "@/src/features/event_attendee/attendee.service";
import { UserService } from "@/src/services/user.service";
import { CertificateService } from "@/src/services/certificate.service";
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
