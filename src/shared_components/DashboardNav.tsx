"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Menu,
    X,
    LayoutDashboard,
    CalendarDays,
    ChartColumn,
    Store,
    FileText,
    Package,
    CalendarCheck,
    type LucideIcon,
} from "lucide-react";
import { NotificationBell } from "@/src/shared_components/NotificationBell";

/**
 * Icons are keyed by name rather than passed as components, because the layouts
 * are Server Components and a React component is a function -- it cannot cross
 * the server/client boundary. EventTab already does this for the same reason.
 */
const ICONS: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    events: CalendarDays,
    analytics: ChartColumn,
    vendors: Store,
    quotes: FileText,
    services: Package,
    bookings: CalendarCheck,
};

export type NavIcon = keyof typeof ICONS;

export type NavItem = { label: string; href: string; icon?: NavIcon };

export type DashboardNavProps = {
    /** Already resolved by the layout: organizer uses userId, vendor roleId. */
    basePath: string;
    name: string;
    items: NavItem[];
    logoUrl?: string;
    unreadCount?: number;
};

/**
 * One navigation for both dashboards, in two shapes.
 *
 * From `lg` up it is a fixed dark rail; below that it stays the topbar it was,
 * with the same mobile panel. Two shapes rather than a sidebar that collapses to
 * icons, because an icon rail needs tooltips to stay usable and this nav is five
 * items long -- the rail earns nothing at that size.
 *
 * The rail is deliberately solid ink. It is the only large dark region in the
 * product, so it anchors every page and gives the eye somewhere to start;
 * without it a monochrome layout reads as floating grey cards on white.
 *
 * OrganizerHeader and VendorHeader were the same component written twice, with
 * two different (both wrong) active-state rules: some items compared the path
 * exactly, so any sub-route lost its highlight, and others used a substring test
 * that could light up two items at once. This uses the longest-prefix match that
 * EventTab already had right.
 */
export function DashboardNav({
    basePath,
    name,
    items,
    logoUrl,
    unreadCount = 0,
}: DashboardNavProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const activeHref = items
        .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    const initial = name?.charAt(0)?.toUpperCase() ?? "?";

    const avatar = (onInk: boolean) => (
        <span
            className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full font-semibold ${
                onInk ? "bg-white/15 text-white" : "bg-gray-200 text-gray-700"
            }`}
        >
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                <span aria-hidden="true">{initial}</span>
            )}
        </span>
    );

    return (
        <>
            {/* ── Rail: lg and up ─────────────────────────────────────────── */}
            <aside className="on-ink fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gray-950 text-white lg:flex">
                <Link
                    href={`${basePath}/dashboard`}
                    className="flex h-16 shrink-0 items-center px-6 text-xl font-bold tracking-tight rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    Avoeline
                </Link>

                <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="flex flex-col gap-1">
                        {items.map(({ label, href, icon }) => {
                            const active = href === activeHref;
                            const Icon = icon ? ICONS[icon] : undefined;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                            active
                                                ? "bg-white font-semibold text-gray-950"
                                                : "font-medium text-white/70 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3">
                    <Link
                        href={`${basePath}/profile`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        {avatar(true)}
                        <span className="truncate text-sm font-medium">{name}</span>
                        <span className="sr-only">Your profile</span>
                    </Link>
                    <span className="shrink-0 px-2">
                        <NotificationBell
                            href={`${basePath}/notifications`}
                            unreadCount={unreadCount}
                            onInk
                        />
                    </span>
                </div>
            </aside>

            {/* ── Topbar: below lg ────────────────────────────────────────── */}
            <header className="border-b border-gray-200 bg-white lg:hidden">
                <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-expanded={menuOpen}
                            aria-controls="dashboard-nav"
                            aria-label={menuOpen ? "Close menu" : "Open menu"}
                            className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <Link
                            href={`${basePath}/dashboard`}
                            className="text-xl font-bold text-gray-900 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            Avoeline
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <NotificationBell href={`${basePath}/notifications`} unreadCount={unreadCount} />

                        {/* One link, one accessible name. Previously the avatar was an
                            img with alt="" inside a link whose only other content was a
                            letter, so a screen reader announced a bare initial. */}
                        <Link
                            href={`${basePath}/profile`}
                            className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            {avatar(false)}
                            <span className="hidden font-medium text-gray-900 sm:inline">{name}</span>
                            <span className="sr-only">Your profile</span>
                        </Link>
                    </div>
                </div>

                {/* Mobile panel */}
                <nav
                    id="dashboard-nav"
                    aria-label="Main"
                    hidden={!menuOpen}
                    className="border-t border-gray-200 px-4 pb-3"
                >
                    <ul className="flex flex-col">
                        {items.map(({ label, href, icon }) => {
                            const active = href === activeHref;
                            const Icon = icon ? ICONS[icon] : undefined;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        // The nav stays mounted across a route change, so the
                                        // panel is closed here rather than by watching the
                                        // pathname from an effect.
                                        onClick={() => setMenuOpen(false)}
                                        className={`flex items-center gap-3 rounded-lg px-2 py-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                                            active ? "font-bold text-black" : "font-medium text-gray-500 hover:text-black"
                                        }`}
                                    >
                                        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </header>
        </>
    );
}
