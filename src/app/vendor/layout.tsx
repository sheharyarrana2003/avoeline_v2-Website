import { AuthService } from "@/src/features/auth/authService";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { DashboardNav } from "@/src/shared_components/DashboardNav";
import { SupportPreviewBanner } from "@/src/shared_components/SupportPreviewBanner";
import { NotificationServices } from "@/src/services/notification.services";
import { AppFooter } from "@/src/shared_components/chrome/AppFooter";
import { UserService } from "@/src/services/user.service";
import { accountIsLive } from "@/src/features/admin/types";
import { signInPath } from "@/src/lib/appUrl";
import { redirect } from "next/navigation";
import { idAfterPrefix, isSupportViewer, requestPathname } from "@/src/features/admin/supportPreview";

export default async function VendorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const u = await AuthService.getCurrentUser();
    if (u === null) {
        redirect(signInPath("/vendor"));
    }

    const support = isSupportViewer(u);
    if (!support && !accountIsLive(u.accountStatus)) {
        redirect("/suspended");
    }

    const pathname = await requestPathname();
    const urlId = idAfterPrefix(pathname, "/vendor");
    const viewedId = support && urlId ? urlId : u.roleId;
    const previewing = support && viewedId !== u.userId && viewedId !== u.roleId;

    if (previewing) {
        const viewed = await UserService.getUserById(viewedId);
        if (!accountIsLive(viewed.accountStatus)) {
            redirect("/admin?e=That vendor is suspended.");
        }
    }

    const vendor = await EventVendorService.getVendorById(viewedId);
    const notifications = await NotificationServices.getAllNotificationsOfUser(viewedId);
    const unreadCount = previewing ? 0 : notifications.filter((n) => n.status !== "read").length;
    const basePath = `/vendor/${viewedId}`;
    const displayName = previewing
        ? (vendor?.businessName || "Vendor")
        : (u.name?.trim() || u.email?.split("@")[0] || "");

    return (
        <>
            {previewing ? <SupportPreviewBanner label={String(vendor?.businessName || displayName)} /> : null}
            <DashboardNav
                basePath={basePath}
                name={previewing ? String(vendor?.businessName || "Vendor") : displayName}
                logoUrl={vendor?.logo || undefined}
                unreadCount={unreadCount}
                items={[
                    { label: "Dashboard", href: `${basePath}/dashboard`, icon: "dashboard" },
                    { label: "Quotes", href: `${basePath}/quotes`, icon: "quotes" },
                    { label: "Services", href: `${basePath}/services`, icon: "services" },
                    { label: "Bookings", href: `${basePath}/bookings`, icon: "bookings" },
                ]}
            />
            <div className="flex flex-1 flex-col md:pl-52">
                <main className="flex-1 pb-12">{children}</main>
                <AppFooter compact />
            </div>
        </>
    );
}
