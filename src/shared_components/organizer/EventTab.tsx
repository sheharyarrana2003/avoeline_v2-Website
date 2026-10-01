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
    Shield,
    UserCog,
    Handshake,
    Download,
    Flag,
    ListChecks,
    Trophy,
    FileText,
    Ticket,
    KeyRound,
    Code2,
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
    staff: UserCog,
    access: KeyRound,
    speakers: UserRoundCog,
    agenda: CalendarDays,
    schedule: CalendarDays,
    vendors: MapPinned,
    venues: MapPinned,
    sponsors: Handshake,
    certificates: Award,
    exports: Download,
    analytics: ChartColumn,
    settings: Settings,
    tickets: Ticket,
    hackathon: Code2,
    competitions: Flag,
    tasks: ListChecks,
    submissions: FileText,
    scoreboard: Trophy,
    teams: Users,
    security: Shield,
};

/**
 * Section navigation for one event.
 *
 * Compact horizontal strip matching the slim dashboard rail density
 * (`text-xs`, 14px icons, tight padding). Scrolls on narrow screens.
 */
export function EventsTab({ tabs }: { tabs: EventTabItem[] }) {
    const current_tab = usePathname();

    const activeHref = tabs
        .filter((t) => current_tab === t.href || current_tab.startsWith(`${t.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <nav aria-label="Event sections" className="-mb-px mt-3 flex gap-0.5 overflow-x-auto">
            {tabs.map((tab) => {
                const isActive = tab.href === activeHref;
                const Icon = iconMap[tab.value] || LayoutDashboard;

                return (
                    <Link
                        key={tab.value}
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-1.5 text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                            isActive
                                ? "border-ink font-semibold text-ink"
                                : "border-transparent font-medium text-ink-soft hover:border-line-loud hover:text-ink"
                        }`}
                    >
                        <Icon size={14} className={`shrink-0 ${isActive ? "text-ink" : "text-ink-soft"}`} />
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
