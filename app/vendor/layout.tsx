import { AuthService } from "@/src/features/auth/authService";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { VendorHeader } from "@/src/shared_components/vendor/VendorHeader";
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
    const vendor = await EventVendorService.getVendorById(u.roleId);

    // Keyed by roleId, the same id vendor notifications are addressed to.
    // Request-cached, so the notifications route shares this one query.
    const notifications = await NotificationServices.getAllNotificationsOfUser(u.roleId);
    const unreadCount = notifications.filter((n) => n.status !== "read").length;

    return (
        <>
            <VendorHeader user={u} logoUrl={vendor?.logo || undefined} unreadCount={unreadCount} />
            <section>{children}</section>
        </>
    )

}