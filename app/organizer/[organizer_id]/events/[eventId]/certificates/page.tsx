import { AttendeeService } from "@/src/features/event_attendee/attendee.service";
import { UserService } from "@/src/services/user.service";
import { CertificateService } from "@/src/services/certificate.service";
import CertificateIssuanceClient from "./certificateClient";
import { AttendeeCertProp } from "./certificateClient";
import { adminAuth } from "@/data/admin_db";

export default async function CertificateIssuancePage({
    params
}: {
    params: Promise<{ organizer_id: string; eventId: string }>
}) {
    const resolvedParams = await params;
    const { organizer_id, eventId } = resolvedParams;


    console.log("zero")
    const attendee = await AttendeeService.getAttendeeOfEvent(eventId);
    const attendeeList = attendee ?? [];

    console.log("one")

    const attendeesWithData: AttendeeCertProp[] = await Promise.all(
        attendeeList.map(async (a) => {
            console.log("onepointfive")

            const [user, certStatus] = await Promise.all([
                UserService.getUserById(a.userId),
                CertificateService.cert_for_attendee(a.userId)

            ])


            return {
                a,
                user,
                certStatus,

            };
        })
    );
    console.log("two")

    async function handleGenerateCertificates(selectedAttendeeIds: string[]) {
        "use server";
        await CertificateService.generateCertificatesForEvent(eventId, organizer_id,)
        // TODO: implement certificate generation logic (I'll write this myself)
    }

    return (
        <CertificateIssuanceClient
            attendees={attendeesWithData}
            eventId={eventId}
            onGenerateCertificates={handleGenerateCertificates}
        />
    );
}