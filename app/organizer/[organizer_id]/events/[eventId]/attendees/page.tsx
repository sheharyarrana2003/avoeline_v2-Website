import { AttendeeService } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";

export default async function speaker({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;

    const attendee = await AttendeeService.getAttendeeOfEvent(event_id);
    let attendeesWithUsers: AttendeeClientSideProp[] = [];
    if (attendee && attendee.length) {
        // Two batched reads for the whole list instead of 2 reads per attendee.
        const [usersById, regs] = await Promise.all([
            UserService.getUsersByIds(attendee.map(a => a.userId)),
            RegService.getRegsOfEvent(event_id),
        ]);
        const regByUser = new Map(regs.map(r => [String(r.userId), r]));

        attendeesWithUsers = attendee
            .map(a => {
                const register = regByUser.get(String(a.userId));
                if (!register) return null;
                return {
                    a,
                    user: usersById.get(String(a.userId))!,
                    register,
                };
            })
            .filter((x): x is AttendeeClientSideProp => x !== null);
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans overflow-hidden">
            <AttendeeClientSide attendees={attendeesWithUsers} />
        </div>
    )
}