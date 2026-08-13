import type { ReactNode } from "react";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";

/**
 * The one table.
 *
 * `src/lib/ui.ts` has exported `tableHead` / `tableCell` / `tableRow` for a while,
 * and three files used them — one of which (RecentRegistrations) re-typed the same
 * strings inline instead of importing them. Five tables were hand-rolled from
 * scratch. So the recipe existed and never spread, which is the usual sign that a
 * string is the wrong unit: nobody reaches for a class string, they copy the table
 * next to them.
 *
 * What a component buys that the strings could not:
 *
 *   - Numeric columns right-align and get tabular figures, always. Hand-rolled
 *     tables left money and counts ragged-left, which is the single thing that makes
 *     a data table hard to scan.
 *   - The `pr-6` gutter is applied by position rather than remembered. Without it
 *     two adjacent headings render as one word ("ATTENDEEEVENT") — a bug that had
 *     already been fixed once by hand.
 *   - Horizontal overflow scrolls the table instead of the page.
 *   - An empty state is structural, not something each caller remembers.
 *
 * A Server Component: `cell` is called during this same server render, so passing a
 * function is fine — the RSC boundary rule is about functions crossing INTO a client
 * component, which this never does.
 */

export interface Column<T> {
    key: string;
    header: string;
    /** "right" also switches the cell to tabular figures. Use it for every number. */
    align?: "left" | "right";
    /** Tailwind width class, e.g. "w-32". Omit to let the column size itself. */
    width?: string;
    cell: (row: T) => ReactNode;
}

export function DataTable<T>({
    rows,
    columns,
    getKey,
    empty,
    caption,
}: {
    rows: T[];
    columns: Column<T>[];
    getKey: (row: T, index: number) => string;
    /** Rendered instead of the table when there are no rows. Usually an <EmptyState>. */
    empty?: ReactNode;
    /** Visually hidden; names the table for screen readers. */
    caption?: string;
}) {
    if (rows.length === 0) return <>{empty ?? null}</>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-full border-collapse text-left">
                {caption ? <caption className="sr-only">{caption}</caption> : null}
                <thead>
                    <tr>
                        {columns.map((c, i) => (
                            <th
                                key={c.key}
                                scope="col"
                                // whitespace-nowrap: these headings are 2xs uppercase with
                                // wide tracking, so a two-word one ("Checked in") wraps at
                                // the slightest squeeze and silently makes the header row
                                // twice as tall.
                                // The last column drops its right gutter so a
                                // right-aligned number sits flush with the edge.
                                className={`${tableHead} whitespace-nowrap ${c.width ?? ""} ${
                                    c.align === "right" ? "text-right" : ""
                                } ${i === columns.length - 1 ? "pr-0" : ""}`}
                            >
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={getKey(row, rowIndex)} className={tableRow}>
                            {columns.map((c, i) => (
                                <td
                                    key={c.key}
                                    // `width` lands on the cell as well as the header. A
                                    // percentage width on the th alone is advisory; the
                                    // `max-w-0` half of the truncation trick has to be on
                                    // the td, or the cell still sizes to its content and
                                    // nothing ever ellipsises.
                                    className={`${tableCell} ${c.width ?? ""} ${
                                        c.align === "right" ? "text-right tabular-nums" : ""
                                    } ${i === columns.length - 1 ? "pr-0" : ""}`}
                                >
                                    {c.cell(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Two facts in one cell, which is how a dense table stays readable: the identifier
 * on top, its qualifier underneath, instead of spending a whole column on each.
 * This is the pattern the reference dashboard uses for name+email and role+department.
 */
export function CellStack({
    primary,
    secondary,
    className = "",
}: {
    primary: ReactNode;
    secondary?: ReactNode;
    className?: string;
}) {
    return (
        // `truncate` below is inert without a bounded width, and a table cell sizes to
        // its content by default — so one long title stretches its column until the
        // right-hand columns are pushed off the table entirely. Callers cap the width
        // through `className`; this is why Column has a `width` too.
        <div className={`min-w-0 ${className}`}>
            <div className="truncate font-medium text-ink">{primary}</div>
            {secondary ? <div className="truncate text-xs text-ink-soft">{secondary}</div> : null}
        </div>
    );
}
