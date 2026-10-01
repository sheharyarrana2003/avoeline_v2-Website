import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { ThemeToggle } from "@/src/shared_components/ui/ThemeToggle";
import { AdminRail, type AdminRailItem } from "@/src/shared_components/AdminRail";
import { AuthService } from "@/src/features/auth/authService";
import { areasFor, type AdminArea } from "@/src/features/admin/types";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";
import { RequireRole } from "@/src/features/auth/components/RequireRole";

const AREA_NAV: Record<AdminArea, { label: string; icon: AdminRailItem["icon"] }> = {
    orgs: { label: "Departments & clubs", icon: "orgs" },
    organizers: { label: "Organizers", icon: "organizers" },
    events: { label: "Events", icon: "events" },
    vendors: { label: "Vendors", icon: "vendors" },
    support: { label: "Support", icon: "support" },
    categories: { label: "Categories", icon: "categories" },
    tenants: { label: "Tenant accounts", icon: "tenants" },
    plans: { label: "Plans", icon: "plans" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const admin = await AuthService.requireAdmin();

    if (!admin) {
        const current = await AuthService.getCurrentUser();
        if (current?.userId) redirect("/access-denied?required=platform_admin");
        return <>{children}</>;
    }

    const areas = areasFor(admin);
    const items: AdminRailItem[] = [
        { label: "Dashboard", href: "/admin", icon: "dashboard" },
        ...areas.map((area) => ({
            label: AREA_NAV[area].label,
            href: area === "orgs" ? "/admin/orgs" : `/admin/${area}`,
            icon: AREA_NAV[area].icon,
        })),
        ...(admin.isOwner ? [{ label: "Platform staff", href: "/admin/admins", icon: "admins" as const }] : []),
    ];

    return (
        <RequireRole allow={["platform_admin"]}>
            <div className="min-h-screen bg-canvas">
                <header className="border-b border-line bg-paper">
                    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 md:pl-52 sm:px-6">
                        <Link href="/admin" className="flex items-center gap-2 rounded-xs md:hidden focus-visible:outline-2 focus-visible:outline-offset-2">
                            <BrandMark className="h-7 w-7" />
                            <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
                                Platform admin
                            </span>
                        </Link>
                        <div className="ml-auto flex items-center gap-4 text-xs text-ink-soft">
                            <ThemeToggle />
                            <span>
                                {admin.email}
                                {admin.isOwner ? <span className="ml-1.5 text-ink">· owner</span> : null}
                            </span>
                            <form action={signOutAction}>
                                <button type="submit" className="font-medium text-ink hover:underline">
                                    Sign out
                                </button>
                            </form>
                        </div>
                    </div>
                </header>

                <AdminRail items={items} />

                <main className="w-full px-4 py-8 md:pl-52 sm:px-6">{children}</main>
            </div>
        </RequireRole>
    );
}
