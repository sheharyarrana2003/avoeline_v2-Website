import { AttendeeService } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";

export default async function speaker({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;

    const attendee = await AttendeeService.getAttendeeOfEvent(event_id);
    let attendeesWithUsers : AttendeeClientSideProp[] ;
    if(attendee){
        console.log("one");
          attendeesWithUsers = await Promise.all(
        attendee.map(async (a) => {

            const [user,reg] = await Promise.all([
                 UserService.getUserById(a.userId),
                 RegService.getRegOfUser(a.userId)
            ])
            return {
                a: a,
                user: user ,
                register: reg
            };
        })
    );
    }else{
        console.log("two");
        attendeesWithUsers = [];
    }

   console.log("mixture og attenee and user ");
   console.log(  attendeesWithUsers );

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans overflow-hidden">
            <AttendeeClientSide attendees={attendeesWithUsers} />
        </div>
    )
}