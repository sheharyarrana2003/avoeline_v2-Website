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
import { BrandMark } from "@/src/shared_components/ui/BrandMark";

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
            {/* ── Rail: lg and up ───────────────────────────────────────────
                Not flat black. A near-black gradient plus a one-pixel inner highlight
                down the right edge makes the rail read as a lit surface rather than a
                painted rectangle — the cheapest way to get depth out of one colour. */}
            <aside className="on-ink fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.07)] lg:flex">
                <Link
                    href={`${basePath}/dashboard`}
                    className="group/brand flex h-16 shrink-0 items-center gap-2.5 px-5 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    {/* Inverted: the marketing header is a black tile with a white glyph,
                        so on the dark rail it is the other way round. */}
                    <BrandMark inverted className="h-8 w-8 shrink-0 transition group-hover/brand:opacity-80" />
                    <span className="font-display text-lg tracking-tight">Avoeline</span>
                </Link>

                <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
                    <p className="px-3 pb-2 pt-1 text-2xs font-medium uppercase text-white/35">Menu</p>
                    <ul className="flex flex-col gap-0.5">
                        {items.map(({ label, href, icon }) => {
                            const active = href === activeHref;
                            const Icon = icon ? ICONS[icon] : undefined;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        // The active row is a soft fill plus a left indicator rather
                                        // than a solid white pill: the pill was unmissable but blunt,
                                        // and inverted one row out of five into a different palette.
                                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                                            active
                                                ? "bg-white/[0.09] font-semibold text-white"
                                                : "font-medium text-white/65 hover:bg-white/[0.06] hover:text-white"
                                        }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-white transition-opacity ${
                                                active ? "opacity-100" : "opacity-0"
                                            }`}
                                        />
                                        {Icon && (
                                            <Icon
                                                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                                                    active ? "text-white" : "text-white/45 group-hover:text-white/80"
                                                }`}
                                                aria-hidden="true"
                                            />
                                        )}
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="shrink-0 border-t border-white/10 p-3">
                    <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1.5 ring-1 ring-white/10">
                        <Link
                            href={`${basePath}/profile`}
                            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {avatar(true)}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium leading-tight">{name}</span>
                                <span className="block text-2xs text-white/45">View profile</span>
                            </span>
                        </Link>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.07]">
                            <NotificationBell
                                href={`${basePath}/notifications`}
                                unreadCount={unreadCount}
                                onInk
                            />
                        </span>
                    </div>
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
