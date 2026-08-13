import { AuthService } from "@/src/features/auth/authService";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { DashboardNav } from "@/src/shared_components/DashboardNav";
import { NotificationServices } from "@/src/services/notification.services";
import { redirect } from "next/navigation";

export default async function VendorLayout({
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

    // Vendor routes are keyed by roleId, not the auth uid the organizer side uses.
    const basePath = `/vendor/${u.roleId}`;

    return (
        <>
            <DashboardNav
                basePath={basePath}
                // Same fallback chain as the dashboard greeting: `name` off the session
                // token is routinely empty, which left the rail showing a blank line above
                // "View profile".
                name={u?.name?.trim() || u?.email?.split("@")[0] || ""}
                logoUrl={vendor?.logo || undefined}
                unreadCount={unreadCount}
                items={[
                    { label: "Dashboard", href: `${basePath}/dashboard`, icon: "dashboard" },
                    { label: "Quotes", href: `${basePath}/quotes`, icon: "quotes" },
                    { label: "Services", href: `${basePath}/services`, icon: "services" },
                    { label: "Bookings", href: `${basePath}/bookings`, icon: "bookings" },
                ]}
            />
            {/* Offsets the fixed rail, which only exists from lg up. */}
            <div className="flex flex-1 flex-col lg:pl-64">
                <main className="flex-1 pb-12">{children}</main>
            </div>
        </>
    )

}