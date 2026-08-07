"use client";

import {
    CalendarDays,
    LayoutDashboard,
    MapPinned,
    Settings,
    UserRoundCog,
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
    speakers: UserRoundCog,
    agenda: CalendarDays,
    schedule: CalendarDays,
    vendors: MapPinned,
    venues: MapPinned,
    settings: Settings,
};

export function EventsTab({ tabs }: { tabs: EventTabItem[] }) {
    const current_tab = usePathname();

    // Overview's href is a prefix of every other tab's href, so a plain
    // substring/prefix test lights up two tabs at once. Pick the single tab
    // whose href is the *longest* match for the current path.
    const activeHref = tabs
        .filter((t) => current_tab === t.href || current_tab.startsWith(`${t.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <aside className="w-full border-b border-gray-200 bg-white p-4 md:min-h-[calc(100vh-73px)] md:w-64 md:border-b-0 md:border-r md:p-6">
            <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Event sections">
                {tabs.map((tab) => {
                    const isActive = tab.href === activeHref;
                    const Icon = iconMap[tab.value] || LayoutDashboard;

                    return (
                        <Link
                            key={tab.value}
                            href={tab.href}
                            className={`flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-extrabold transition md:w-full ${isActive
                                    ? "bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                }`}
                        >
                            <Icon size={18} className={isActive ? "text-white" : "text-gray-500"} />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
