import { AttendeeService } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { UserService } from "@/src/services/user.service";

export default async function speaker({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.id;
    const attendee = await AttendeeService.getAttendeeOfEvent(event_id);
    let attendeesWithUsers : AttendeeClientSideProp[] ;
    if(attendee){
          attendeesWithUsers = await Promise.all(
        attendee.map(async (a) => {
            const user = await UserService.getUserById(a.userId);
            return {
                a: a,
                user: user 
            };
        })
    );
    }else{
        attendeesWithUsers = [];
    }

   

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans overflow-hidden">
            <AttendeeClientSide attendees={attendeesWithUsers} />
        </div>
    )
}