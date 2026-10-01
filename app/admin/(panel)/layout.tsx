import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { EventsTab } from "@/src/shared_components/organizer/EventTab";
import { AuthService } from "@/src/features/auth/authService";
import { areasFor, ADMIN_AREA_META, type AdminArea } from "@/src/features/admin/types";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";

/**
 * The admin shell (spec 9.1).
 *
 * In a `(panel)` route group so `/admin/signin` is NOT its child: a layout that
 * guarded its own login page would redirect to itself for ever. The group
 * changes no URL -- this file still wraps `/admin`, `/admin/events` and the
 * rest.
 *
 * Signed-out visitors go to `/admin/signin`, not the shared sign-in page: the
 * spec asks for a separate admin login, and bouncing an admin through the same
 * form that redirects organizers to their dashboard is the thing it is asking
 * to avoid.
 *
 * The nav shows only the areas this admin holds. That is presentation, not
 * security -- every page below re-checks with `requireAdmin(area)` and so does
 * every action, because a Server Action is a public endpoint this layout never
 * sees.
 *
 * `EventsTab` rather than `DashboardNav`: the latter hardcodes
 * `${basePath}/dashboard`, `/profile` and `/notifications`, none of which exist
 * here, while `EventsTab` is already a pathname-driven list of links.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const admin = await AuthService.requireAdmin();

    if (!admin) {
        const current = await AuthService.getCurrentUser();
        // Signed in as somebody else entirely: send them home rather than to a
        // login form they have already passed.
        if (current?.userId) redirect("/");
        redirect("/admin/signin?next=/admin");
    }

    const areas = areasFor(admin);
    const NAV_ICON: Record<AdminArea, string> = {
        organizers: "attendees",
        events: "events",
        vendors: "vendors",
        support: "quotes",
        categories: "overview",
    };

    const tabs = [
        { label: "Dashboard", value: "dashboard", href: "/admin" },
        ...areas.map((area) => ({
            label: ADMIN_AREA_META[area].label,
            value: NAV_ICON[area],
            href: `/admin/${area}`,
        })),
        ...(admin.isOwner ? [{ label: "Admins", value: "settings", href: "/admin/admins" }] : []),
    ];

    return (
        <div className="min-h-screen bg-canvas">
            <header className="border-b border-line bg-paper">
                <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                    <Link href="/admin" className="flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                        <BrandMark className="h-7 w-7" />
                        <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
                            Platform admin
                        </span>
                    </Link>
                    <div className="flex items-center gap-4 text-xs text-ink-soft">
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
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                    <EventsTab tabs={tabs} />
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}
