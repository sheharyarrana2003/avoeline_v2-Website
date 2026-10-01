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
    Code2,
    LogOut,
    Building2,
    Megaphone,
    Inbox,
    Users,
    type LucideIcon,
} from "lucide-react";
import { NotificationBell } from "@/src/shared_components/NotificationBell";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { ThemeToggle } from "@/src/shared_components/ui/ThemeToggle";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";

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
    hackathon: Code2,
    clubs: Building2,
    announce: Megaphone,
    requests: Inbox,
    teams: Users,
};

export type NavIcon = keyof typeof ICONS;

export type NavItem = { label: string; href: string; icon?: NavIcon; activePrefix?: string };

export type DashboardNavProps = {
    /** Already resolved by the layout: organizer uses userId, vendor roleId. */
    basePath: string;
    /** Brand / home link. Defaults to `{basePath}/dashboard`. */
    homeHref?: string;
    /** Hide profile + notifications when this chrome has no account pages. */
    showAccount?: boolean;
    name: string;
    items: NavItem[];
    logoUrl?: string;
    unreadCount?: number;
    profileHref?: string;
    notificationsHref?: string;
};

/**
 * One navigation for both dashboards, in two shapes.
 *
 * From `md` up it is a fixed dark rail; below that it stays the topbar it was,
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
    homeHref,
    showAccount = true,
    profileHref,
    notificationsHref,
}: DashboardNavProps) {
    const home = homeHref ?? `${basePath}/dashboard`;
    const profile = profileHref ?? `${basePath}/profile`;
    const notifications = notificationsHref ?? `${basePath}/notifications`;
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const activeHref = items
        .filter((i) => {
            const homeItem = i.href === home;
            const pathMatch = homeItem
                ? pathname === i.href
                : pathname === i.href || pathname.startsWith(`${i.href}/`);
            const aliasMatch =
                !!i.activePrefix &&
                (pathname === i.activePrefix || pathname.startsWith(`${i.activePrefix}/`));
            return pathMatch || aliasMatch;
        })
        .sort((a, b) => {
            const aLen = Math.max(a.href.length, a.activePrefix?.length ?? 0);
            const bLen = Math.max(b.href.length, b.activePrefix?.length ?? 0);
            return bLen - aLen;
        })[0]?.href;

    const initial = name?.charAt(0)?.toUpperCase() ?? "?";

    const avatar = (onInk: boolean) => (
        <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${
                // A logo needs a light backing: most are dark marks on transparent, and
                // on the near-black rail those vanish into it entirely.
                logoUrl ? "bg-white" : onInk ? "bg-white/15 text-white" : "bg-muted-strong text-ink"
            }`}
        >
            {logoUrl ? (
                // object-contain, not cover. A logo is usually wider than it is tall, so
                // cropping it into a 32px circle keeps the middle and throws away the
                // mark — which is why this rendered as an unreadable fragment. Contain
                // plus a hair of padding shows the whole thing, small but recognisable.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
            ) : (
                <span aria-hidden="true">{initial}</span>
            )}
        </span>
    );

    return (
        <>
            {/* ── Rail: md and up ───────────────────────────────────────────
                Not flat black. A near-black gradient plus a one-pixel inner highlight
                down the right edge makes the rail read as a lit surface rather than a
                painted rectangle — the cheapest way to get depth out of one colour. */}
            <aside className="on-ink fixed inset-y-0 left-0 z-30 hidden w-48 flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.07)] md:flex">
                <Link
                    href={home}
                    className="group/brand flex h-12 shrink-0 items-center gap-2 px-3 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <BrandMark inverted className="h-6 w-6 shrink-0 transition group-hover/brand:opacity-80" />
                    <span className="font-display text-sm tracking-tight">Avoeline</span>
                </Link>

                <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 pb-4">
                    <p className="px-2 pb-1 pt-0.5 text-2xs font-medium uppercase tracking-wider text-white/40">Menu</p>
                    <ul className="flex flex-col gap-0.5">
                        {items.map(({ label, href, icon }) => {
                            const active = href === activeHref;
                            const Icon = icon ? ICONS[icon] : undefined;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        aria-current={active ? "page" : undefined}
                                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                                            active
                                                ? "bg-white/12 font-semibold text-white"
                                                : "text-white/70 hover:bg-white/8 hover:text-white"
                                        }`}
                                    >
                                        {Icon && (
                                            <Icon
                                                size={14}
                                                className="shrink-0"
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

                {/* Two rows, not one. The identity and three controls were competing for
                    a 256px rail, which squeezed the name to nothing — and the name is
                    often empty anyway, so the block read as a bare "View profile" with a
                    blank line above it. The name gets the full width now, and the actions
                    get a row where a fourth (sign out) fits without crowding. */}
                <div className="shrink-0 border-t border-white/10 p-2">
                    <div className="rounded-lg bg-white/[0.04] p-1 ring-1 ring-white/10">
                        {showAccount ? (
                        <Link
                            href={profile}
                            className="flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            {avatar(true)}
                            <span className="min-w-0 flex-1">
                                {name ? (
                                    <span className="block truncate text-sm font-medium leading-tight">{name}</span>
                                ) : null}
                                <span className={`block truncate ${name ? "text-2xs text-white/45" : "text-sm font-medium"}`}>
                                    View profile
                                </span>
                            </span>
                        </Link>
                        ) : (
                        <div className="flex min-w-0 items-center gap-2.5 px-1.5 py-1.5">
                            {avatar(true)}
                            <span className="min-w-0 truncate text-sm font-medium">{name}</span>
                        </div>
                        )}

                        <div className="mt-1 flex items-center gap-1 border-t border-white/10 pt-1">
                            <ThemeToggle onInk />
                            {showAccount ? (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.07]">
                                <NotificationBell
                                    href={notifications}
                                    unreadCount={unreadCount}
                                    onInk
                                />
                            </span>
                            ) : null}
                            {/* A plain form, so signing out survives with JavaScript off and
                                needs no client component. */}
                            <form action={signOutAction} className="ml-auto">
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-2xs font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    <LogOut className="h-[15px] w-[15px]" aria-hidden="true" />
                                    Sign out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Topbar: below md ────────────────────────────────────────── */}
            <header className="border-b border-line bg-paper md:hidden">
                <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-expanded={menuOpen}
                            aria-controls="dashboard-nav"
                            aria-label={menuOpen ? "Close menu" : "Open menu"}
                            className="rounded-lg p-1.5 text-ink-soft transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <Link
                            href={home}
                            className="text-xl font-bold text-ink rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            Avoeline
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <ThemeToggle />
                        {showAccount ? (
                        <NotificationBell href={notifications} unreadCount={unreadCount} />
                        ) : null}

                        {/* One link, one accessible name. Previously the avatar was an
                            img with alt="" inside a link whose only other content was a
                            letter, so a screen reader announced a bare initial. */}
                        {showAccount ? (
                        <Link
                            href={profile}
                            className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {avatar(false)}
                            {name ? <span className="hidden font-medium text-ink sm:inline">{name}</span> : null}
                            <span className="sr-only">Your profile</span>
                        </Link>
                        ) : null}

                        {/* The rail is hidden below lg, so without this there is no way to
                            sign out on a phone at all. */}
                        <form action={signOutAction}>
                            <button
                                type="submit"
                                aria-label="Sign out"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                                <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Mobile panel */}
                <nav
                    id="dashboard-nav"
                    aria-label="Main"
                    hidden={!menuOpen}
                    className="border-t border-line px-4 pb-3"
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
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                                            active
                                                ? "bg-primary-soft font-semibold text-primary"
                                                : "font-medium text-ink-soft hover:bg-muted hover:text-ink"
                                        }`}
                                    >
                                        {Icon && (
                                            <Icon
                                                className={`h-4 w-4 shrink-0 transition-colors ${
                                                    active ? "text-primary" : "text-ink-soft"
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
            </header>
        </>
    );
}
