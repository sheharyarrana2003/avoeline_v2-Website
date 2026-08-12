import { DashboardNav } from "@/src/shared_components/DashboardNav";
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

    // Organizer routes are keyed by the auth uid, vendor ones by roleId.
    const basePath = `/organizer/${u.userId}`;

    return (
        <>
            <DashboardNav
                basePath={basePath}
                name={u?.name ?? ""}
                logoUrl={organizer.organization.logo || undefined}
                unreadCount={unreadCount}
                items={[
                    { label: "Dashboard", href: `${basePath}/dashboard`, icon: "dashboard" },
                    { label: "Events", href: `${basePath}/events`, icon: "events" },
                    { label: "Analytics", href: `${basePath}/analytics`, icon: "analytics" },
                    { label: "Marketplace", href: `${basePath}/vendor-marketplace`, icon: "vendors" },
                    { label: "Quotes", href: `${basePath}/quotes`, icon: "quotes" },
                ]}
            />
            {/* Offsets the fixed rail, which only exists from lg up. */}
            <div className="flex flex-1 flex-col lg:pl-64">
                <main className="flex-1 pb-12">{children}</main>
                <OrganizerFooter />
            </div>
        </>
    )

}