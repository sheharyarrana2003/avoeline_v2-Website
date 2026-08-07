"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NotificationBell } from "@/src/shared_components/NotificationBell";

export type NavItem = { label: string; href: string };

export type DashboardHeaderProps = {
    /** Already resolved by the layout: organizer uses userId, vendor roleId. */
    basePath: string;
    name: string;
    items: NavItem[];
    logoUrl?: string;
    unreadCount?: number;
};

/**
 * One header for both dashboards.
 *
 * OrganizerHeader and VendorHeader were the same component written twice, with
 * two different ways of declaring the nav and two different (both wrong)
 * active-state rules: some items compared the path exactly, so any sub-route
 * lost its highlight, and others used a substring test that could light up two
 * items at once. This uses the longest-prefix match that EventTab already had
 * right.
 *
 * Neither original had any mobile treatment -- `flex space-x-6` simply ran off
 * the side of the screen.
 */
export function DashboardHeader({
    basePath,
    name,
    items,
    logoUrl,
    unreadCount = 0,
}: DashboardHeaderProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const activeHref = items
        .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    const linkClass = (href: string) =>
        href === activeHref
            ? "text-black font-bold"
            : "text-gray-500 font-medium hover:text-black";

    const initial = name?.charAt(0)?.toUpperCase() ?? "?";

    return (
        <header className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-expanded={menuOpen}
                        aria-controls="dashboard-nav"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100 md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                    </button>

                    <Link
                        href={`${basePath}/dashboard`}
                        className="text-xl font-bold text-gray-900 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        Avoeline
                    </Link>
                </div>

                <nav aria-label="Main" className="hidden md:block">
                    <ul className="flex items-center gap-6">
                        {items.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    aria-current={item.href === activeHref ? "page" : undefined}
                                    className={`rounded text-sm transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black ${linkClass(item.href)}`}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="flex items-center gap-3 sm:gap-4">
                    <NotificationBell href={`${basePath}/notifications`} unreadCount={unreadCount} />

                    {/* One link, one accessible name. Previously the avatar was an
                        img with alt="" inside a link whose only other content was a
                        letter, so a screen reader announced a bare initial. */}
                    <Link
                        href={`${basePath}/profile`}
                        className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-semibold text-gray-700">
                            {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span aria-hidden="true">{initial}</span>
                            )}
                        </span>
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
                className="border-t border-gray-200 px-4 pb-3 md:hidden"
            >
                <ul className="flex flex-col">
                    {items.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={item.href === activeHref ? "page" : undefined}
                                // The header stays mounted across a nav, so the
                                // panel is closed here rather than by watching
                                // the pathname from an effect.
                                onClick={() => setMenuOpen(false)}
                                className={`block rounded-lg px-2 py-3 text-sm transition ${linkClass(item.href)} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black`}
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </header>
    );
}
