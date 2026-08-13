import Link from "next/link";

/**
 * The list-filter strip.
 *
 * Written out as inline JSX three times — organizer events, organizer quotes and
 * all-vendors — and the three had already drifted: two underlined the active tab in
 * ink, one in accent, and only two showed counts. Accent wins, because "active" is
 * state, and state is the one thing this product spends its accent on.
 *
 * Counts are part of the component rather than optional decoration on purpose. A
 * filter that does not say how many rows it leads to makes you click it to find out,
 * and an empty tab is indistinguishable from a broken one until you do.
 *
 * Deliberately NOT merged with `organizer/EventTab.tsx`, despite looking identical.
 * EventTab derives its active item from `usePathname` and is a Client Component;
 * these tabs are driven by a `?status=` / `?tab=` query param the server already
 * parsed. Merging them would mean either a client boundary on every list page or
 * prop-drilling the pathname into the server one — both worse than two small files.
 */

export interface FilterTab {
    label: string;
    value: string;
    href: string;
    count?: number;
}

export function FilterTabs({
    tabs,
    activeValue,
    label,
}: {
    tabs: FilterTab[];
    activeValue: string;
    /** Names the strip, e.g. "Event filters". Two nav landmarks on a page need distinct names. */
    label: string;
}) {
    return (
        // Scrolls rather than wraps: a wrapping strip changes height when the window
        // narrows and everything below it jumps.
        <nav aria-label={label} className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
            {tabs.map((tab) => {
                const isActive = tab.value === activeValue;
                return (
                    <Link
                        key={tab.value}
                        href={tab.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                            isActive
                                ? "border-accent font-semibold text-ink"
                                : "border-transparent font-medium text-ink-soft hover:border-line-loud hover:text-ink"
                        }`}
                    >
                        {tab.label}
                        {typeof tab.count === "number" ? (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-2xs tabular-nums ${
                                    isActive ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
                                }`}
                            >
                                {tab.count}
                            </span>
                        ) : null}
                    </Link>
                );
            })}
        </nav>
    );
}
