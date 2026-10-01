import { DashboardNav } from "@/src/shared_components/DashboardNav";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerService } from "@/src/services/organizer.service";
import { OrganizerFooter } from "@/src/shared_components/organizer/OrganizerFooter";
import { NotificationServices } from "@/src/services/notification.services";
import { redirect } from "next/navigation";
import { UserService } from "@/src/services/user.service";
import { accountIsLive } from "@/src/features/admin/types";

export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {

    const u = await AuthService.getCurrentUser();
    if (u === null) {
        redirect("/auth/signup");
    }

    // Spec 9.3: a suspended organizer loses their dashboard, not only their
    // public listings. Checked here because `accountStatus` is not in the
    // session claims and their cookie stays valid for up to five days, so
    // waiting for it to expire would leave them working for most of a week.
    // The read is cache()-wrapped and this layout already awaits Firestore.
    if (!accountIsLive((await UserService.getUserById(u.userId)).accountStatus)) {
        redirect("/suspended");
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
                // Same fallback chain as the dashboard greeting: `name` off the session
                // token is routinely empty, which left the rail showing a blank line above
                // "View profile".
                name={u?.name?.trim() || u?.email?.split("@")[0] || ""}
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