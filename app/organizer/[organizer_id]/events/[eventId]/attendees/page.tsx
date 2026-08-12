import { AttendeeService, emptyAttendeeForUser } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { EventService } from "@/src/services/event.service";
import { Registration } from "@/src/services/models/reg.type";

export default async function speaker({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;

    // Drive the list off registrations, not attendee profiles: every registrant
    // must show up, whether or not they have an `attendees` profile doc.
    const [regs, event] = await Promise.all([
        RegService.getRegsOfEvent(event_id),
        EventService.getEventByID(event_id),
    ]);

    let attendeesWithUsers: AttendeeClientSideProp[] = [];
    if (regs.length) {
        const userIds = regs.map(r => r.userId).filter(Boolean);
        const [usersById, attendeesByUser] = await Promise.all([
            UserService.getUsersByIds(userIds),
            AttendeeService.getAttendeeProfilesByUserIds(userIds),
        ]);

        attendeesWithUsers = regs.map(register => ({
            a: attendeesByUser.get(String(register.userId)) ?? emptyAttendeeForUser(String(register.userId)),
            user: usersById.get(String(register.userId))!,
            register,
        }));
    }

    const handle_reg_status = async(registeration: Registration)=>{
        'use server'
        await RegService.updateReg(registeration)
    }
    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8 font-sans overflow-hidden">
            <AttendeeClientSide attendees={attendeesWithUsers} handle_reg_status={handle_reg_status} eventTitle={event?.title ?? "Event Attendees"} />
        </div>
    )
}
