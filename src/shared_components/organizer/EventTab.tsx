"use client";

import {
    CalendarDays,
    LayoutDashboard,
    MapPinned,
    Settings,
    UserRoundCog,
    Users,
    Award,
    ChartColumn,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

export interface EventTabItem {
    label: string;
    value: string;
    href: string;
}

const iconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
    overview: LayoutDashboard,
    dashboard: LayoutDashboard,
    attendees: Users,
    speakers: UserRoundCog,
    agenda: CalendarDays,
    schedule: CalendarDays,
    vendors: MapPinned,
    venues: MapPinned,
    certificates: Award,
    analytics: ChartColumn,
    settings: Settings,
};

/**
 * Section navigation for one event.
 *
 * A horizontal strip rather than the sidebar this used to be: the product now
 * has a persistent rail of its own, and two stacked sidebars ate roughly five
 * hundred pixels before any content began. Section nav sitting under the page it
 * belongs to is also the more honest hierarchy -- these tabs are subordinate to
 * the global nav, not a peer of it.
 *
 * Scrolls horizontally on narrow screens instead of wrapping, so the row height
 * never changes and the content below does not jump.
 */
export function EventsTab({ tabs }: { tabs: EventTabItem[] }) {
    const current_tab = usePathname();

    // Overview's href is a prefix of every other tab's href, so a plain
    // substring/prefix test lights up two tabs at once. Pick the single tab
    // whose href is the *longest* match for the current path.
    const activeHref = tabs
        .filter((t) => current_tab === t.href || current_tab.startsWith(`${t.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <nav
            aria-label="Event sections"
            className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 sm:px-6"
        >
            {tabs.map((tab) => {
                const isActive = tab.href === activeHref;
                const Icon = iconMap[tab.value] || LayoutDashboard;

                return (
                    <Link
                        key={tab.value}
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                            isActive
                                ? "border-gray-900 font-semibold text-gray-900"
                                : "border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-900"
                        }`}
                    >
                        <Icon size={16} className="shrink-0" />
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
