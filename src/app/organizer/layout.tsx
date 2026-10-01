import { DashboardNav } from "@/src/shared_components/DashboardNav";
import { SupportPreviewBanner } from "@/src/shared_components/SupportPreviewBanner";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerService } from "@/src/services/organizer.service";
import { AppFooter } from "@/src/shared_components/chrome/AppFooter";
import { signInPath } from "@/src/lib/appUrl";
import { NotificationServices } from "@/src/services/notification.services";
import { redirect } from "next/navigation";
import { UserService } from "@/src/services/user.service";
import { accountIsLive } from "@/src/features/admin/types";
import { RequireRole } from "@/src/features/auth/components/RequireRole";
import { idAfterPrefix, isSupportViewer, requestPathname } from "@/src/features/admin/supportPreview";
import { departmentChrome, departmentRedirectFromOrganizer } from "@/src/features/department/department.service";
import { clubChrome, clubRedirectFromOrganizer } from "@/src/features/clubs/club.service";

export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const u = await AuthService.getCurrentUser();
    if (u === null) {
        redirect(signInPath("/organizer"));
    }

    const support = isSupportViewer(u);
    if (!support && !accountIsLive(u.accountStatus)) {
        redirect("/suspended");
    }

    const pathname = await requestPathname();
    const urlId = idAfterPrefix(pathname, "/organizer");
    const viewedId = support && urlId ? urlId : u.userId;
    const previewing = support && viewedId !== u.userId;

    if (previewing) {
        const viewed = await UserService.getUserById(viewedId);
        if (!accountIsLive(viewed.accountStatus)) {
            redirect("/admin?e=That organizer is suspended.");
        }
    }

    const departmentActor = u.role === "department_admin" && !previewing;
    if (departmentActor) {
        const chrome = await departmentChrome({
            userId: u.userId,
            orgId: u.orgId,
            name: u.name,
            email: u.email,
        });
        const bounce = departmentRedirectFromOrganizer(
            pathname,
            viewedId,
            !!chrome.plan?.modules.includes("vendor_store"),
        );
        if (bounce) redirect(bounce);

        return (
            <RequireRole allow={["platform_admin", "department_admin", "organizer"]}>
                <DashboardNav
                    basePath="/department"
                    homeHref="/department"
                    showAccount={false}
                    name={chrome.name}
                    items={chrome.items}
                />
                <div className="flex flex-1 flex-col md:pl-52">
                    <main className="flex-1 pb-12">{children}</main>
                    <AppFooter compact />
                </div>
            </RequireRole>
        );
    }

    const clubId = u.presidentOfOrgIds?.[0];
    if (clubId && !previewing) {
        const chrome = await clubChrome(clubId, u.userId);
        const bounce = clubRedirectFromOrganizer(pathname, viewedId, clubId, chrome.modules);
        if (bounce) redirect(bounce);
        const notifications = await NotificationServices.getAllNotificationsOfUser(u.userId);
        const unreadCount = notifications.filter((n) => n.status !== "read").length;
        return (
            <RequireRole allow={["platform_admin", "department_admin", "organizer"]}>
                <DashboardNav
                    basePath={`/clubs/${clubId}`}
                    homeHref={`/clubs/${clubId}`}
                    showAccount
                    profileHref={`/organizer/${u.userId}/profile`}
                    notificationsHref={`/organizer/${u.userId}/notifications`}
                    name={chrome.name}
                    unreadCount={unreadCount}
                    items={chrome.items}
                />
                <div className="flex flex-1 flex-col md:pl-52">
                    <main className="flex-1 pb-12">{children}</main>
                    <AppFooter compact />
                </div>
            </RequireRole>
        );
    }

    const organizer = await OrganizerService.getOrganizerById(viewedId);
    const notifications = await NotificationServices.getAllNotificationsOfUser(viewedId);
    const unreadCount = previewing ? 0 : notifications.filter((n) => n.status !== "read").length;
    const basePath = `/organizer/${viewedId}`;
    const displayName = previewing
        ? (organizer.organization.name || "Organizer")
        : (u.name?.trim() || u.email?.split("@")[0] || "");

    const { hasModuleAccess } = await import("@/src/features/permissions/permissions.service");
    const [eventsOk, analyticsOk, storeOk, designerOk, ushersOk] = await Promise.all([
        hasModuleAccess(viewedId, "events_dashboard"),
        hasModuleAccess(viewedId, "analytics_basic"),
        hasModuleAccess(viewedId, "vendor_store"),
        hasModuleAccess(viewedId, "ai_designer"),
        hasModuleAccess(viewedId, "ushers_ops"),
    ]);

    return (
        <RequireRole allow={["platform_admin", "department_admin", "organizer"]}>
            {previewing ? <SupportPreviewBanner label={displayName} /> : null}
            <DashboardNav
                basePath={basePath}
                name={displayName}
                logoUrl={organizer.organization.logo || undefined}
                unreadCount={unreadCount}
                items={[
                    { label: "Dashboard", href: `${basePath}/dashboard`, icon: "dashboard" },
                    ...(eventsOk ? [{ label: "Events", href: `${basePath}/events`, icon: "events" as const }] : []),
                    ...(analyticsOk ? [{ label: "Analytics", href: `${basePath}/analytics`, icon: "analytics" as const }] : []),
                    ...(storeOk ? [{ label: "Marketplace", href: `${basePath}/vendor-marketplace`, icon: "vendors" as const }] : []),
                    ...(designerOk ? [{ label: "Designer", href: `${basePath}/designer`, icon: "analytics" as const }] : []),
                    ...(ushersOk ? [{ label: "Ushers", href: `${basePath}/ushers`, icon: "bookings" as const }] : []),
                    ...(storeOk ? [{ label: "Quotes", href: `${basePath}/quotes`, icon: "quotes" as const }] : []),
                ]}
            />
            <div className="flex flex-1 flex-col md:pl-52">
                <main className="flex-1 pb-12">{children}</main>
                <AppFooter compact />
            </div>
        </RequireRole>
    );
}
