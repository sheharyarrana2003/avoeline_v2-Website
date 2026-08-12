import { AttendeeService, emptyAttendeeForUser } from "@/src/features/event_attendee/attendee.service"
import { AttendeeClientSide, AttendeeClientSideProp } from "@/src/features/event_attendee/components/AttendeeClientSide";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { Registration } from "@/src/services/models/reg.type";

export default async function AttendeesPage({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;

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

        attendeesWithUsers = regs.map(register => ({
            a: attendeesByUser.get(String(register.userId)) ?? emptyAttendeeForUser(String(register.userId)),
            user: usersById.get(String(register.userId))!,
            register,
        }));
    }

    const handle_reg_status = async (registeration: Registration) => {
        'use server'
        await RegService.updateReg(registeration)
    }

    // No padding and no event title here: the event layout renders both, and this
    // page's job is the Attendees section of it.
    return <AttendeeClientSide attendees={attendeesWithUsers} handle_reg_status={handle_reg_status} />;
}
