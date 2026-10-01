"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Menu,
    X,
    LayoutDashboard,
    Building2,
    Users,
    CalendarDays,
    Store,
    LifeBuoy,
    FolderTree,
    ShieldCheck,
    KeyRound,
    CreditCard,
    type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";

export type AdminRailItem = { label: string; href: string; icon: AdminRailIcon };

export type AdminRailIcon =
    | "dashboard"
    | "orgs"
    | "organizers"
    | "events"
    | "vendors"
    | "support"
    | "categories"
    | "admins"
    | "tenants"
    | "plans";

const ICONS: Record<AdminRailIcon, LucideIcon> = {
    dashboard: LayoutDashboard,
    orgs: Building2,
    organizers: Users,
    events: CalendarDays,
    vendors: Store,
    support: LifeBuoy,
    categories: FolderTree,
    admins: ShieldCheck,
    tenants: KeyRound,
    plans: CreditCard,
};

export function AdminRail({ items }: { items: AdminRailItem[] }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const activeHref = items
        .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    const links = (onInk: boolean) =>
        items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === activeHref;
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                        onInk
                            ? active
                                ? "bg-white/12 font-semibold text-white"
                                : "text-white/70 hover:bg-white/8 hover:text-white"
                            : active
                              ? "bg-muted font-semibold text-ink"
                              : "text-ink-soft hover:bg-muted hover:text-ink"
                    }`}
                >
                    <Icon size={14} className="shrink-0" aria-hidden />
                    {item.label}
                </Link>
            );
        });

    return (
        <>
            <aside className="on-ink fixed inset-y-0 left-0 z-30 hidden w-48 flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.07)] md:flex">
                <Link href="/admin" className="flex h-12 shrink-0 items-center gap-2 px-3">
                    <BrandMark inverted className="h-6 w-6 shrink-0" />
                    <span className="font-display text-sm tracking-tight">Admin</span>
                </Link>
                <p className="px-3 pb-1 text-2xs font-medium uppercase tracking-wider text-white/40">Platform</p>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4" aria-label="Admin sections">
                    {links(true)}
                </nav>
            </aside>

            <div className="sticky top-0 z-20 border-b border-line bg-paper md:hidden">
                <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                >
                    Sections
                    {open ? <X size={18} /> : <Menu size={18} />}
                </button>
                {open ? (
                    <nav className="flex flex-col gap-0.5 border-t border-line px-3 py-3" aria-label="Admin sections">
                        {links(false)}
                    </nav>
                ) : null}
            </div>
        </>
    );
}
