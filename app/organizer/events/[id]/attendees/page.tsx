import { AttendeeService } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { UserService } from "@/src/services/user.service";


export default async function speaker({ params }: { params: Promise<{ id: string }> }) {

    const resolvedParams = await params;
    const event_id = resolvedParams.id;
    const attendee = await AttendeeService.getAttendeeOfEvent(event_id);

    const attendeesWithUsers = await Promise.all(
        attendee.map(async (a) => {
            const user = await UserService.getUserById(a.userId);
            return {
                a: a,
                user: user 
            };
        })
    );


    return (
        <>
            <h1>Attendee</h1>
            <h1>general log</h1>
            <br />
            <br />
            <h1>input </h1>

            <AttendeeClientSide attendee={attendeesWithUsers} />



        </>


    )
}