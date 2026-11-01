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
import {
  idAfterPrefix,
  isSupportViewer,
  requestPathname,
} from "@/src/features/admin/supportPreview";
import { hasVendorModuleAccess } from "@/src/features/permissions/permissions.service";

export const metadata = { robots: { index: false, follow: false } };

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
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

  // S9: no impersonation — platform staff use /admin/vendors/[id].
  if (previewing) {
    redirect(`/admin/vendors/${viewedId}`);
  }

  // Self-serve vendors wait for admin approval (mirrors organizer review_status).
  if (!support) {
    const { TABLES } = await import("@/data/collections");
    const { supabaseAdmin } = await import("@/data/supabase");
    const { data: vendorProfile } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("status")
      .eq("user_id", u.userId)
      .maybeSingle();
    const status = String(vendorProfile?.status || "pending").toLowerCase();
    const normalized = status === "active" ? "approved" : status;
    if (normalized === "pending" || normalized === "rejected") {
      redirect("/auth/signup/awaiting-approval");
    }
  }

  const vendor = await EventVendorService.getVendorById(viewedId);
  const notifications = await NotificationServices.getAllNotificationsOfUser(viewedId);
  const unreadCount = previewing ? 0 : notifications.filter((n) => n.status !== "read").length;
  const basePath = `/vendor/${viewedId}`;
  const displayName = previewing
    ? vendor?.businessName || "Vendor"
    : u.name?.trim() || u.email?.split("@")[0] || "";

  const [quotes, services, bookings] = await Promise.all([
    hasVendorModuleAccess(viewedId, "vendor_quotes"),
    hasVendorModuleAccess(viewedId, "vendor_services"),
    hasVendorModuleAccess(viewedId, "vendor_bookings"),
  ]);

  const items = [
    { label: "Dashboard", href: `${basePath}/dashboard`, icon: "dashboard" as const },
    ...(quotes ? [{ label: "Quotes", href: `${basePath}/quotes`, icon: "quotes" as const }] : []),
    ...(services
      ? [{ label: "Services", href: `${basePath}/services`, icon: "services" as const }]
      : []),
    ...(bookings
      ? [{ label: "Bookings", href: `${basePath}/bookings`, icon: "bookings" as const }]
      : []),
  ];

  return (
    <>
      {previewing ? (
        <SupportPreviewBanner label={String(vendor?.businessName || displayName)} />
      ) : null}
      <DashboardNav
        basePath={basePath}
        name={previewing ? String(vendor?.businessName || "Vendor") : displayName}
        logoUrl={vendor?.logo || undefined}
        unreadCount={unreadCount}
        items={items}
      />
      <div className="flex flex-1 flex-col md:pl-52">
        <main className="flex-1 pb-12">{children}</main>
        <AppFooter compact />
      </div>
    </>
  );
}
