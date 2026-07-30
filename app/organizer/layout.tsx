import { OrganizerHeader } from "@/src/shared_components/organizer/OrganizerHeader";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerService } from "@/src/services/organizer.service";
import { OrganizerFooter } from "@/src/shared_components/organizer/OrganizerFooter";
import { NotificationServices } from "@/src/services/notification.services";
import { redirect } from "next/navigation";

export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {

    const u = await AuthService.getCurrentUser();
    if (u === null) {
        redirect("/auth/signup");
    }

    // Request-cached read (deduped with the profile page); used for the header avatar.
    const organizer = await OrganizerService.getOrganizerById(u.userId);

    // Also request-cached, so on the notifications route this is the same single
    // query the page itself makes rather than a second one.
    const notifications = await NotificationServices.getAllNotificationsOfUser(u.userId);
    const unreadCount = notifications.filter((n) => n.status !== "read").length;

    return (
        <>
            <OrganizerHeader
                user={u}
                logoUrl={organizer.organization.logo || undefined}
                unreadCount={unreadCount}
            />
            <section>{children}</section>
            <br />
            <br />
            <OrganizerFooter></OrganizerFooter>
        </>
    )

}