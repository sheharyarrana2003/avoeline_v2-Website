import type { ReactNode } from "react";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";

/**
 * Shared data table — **Server Component**.
 *
 * `cell` / `getKey` run during the same server render, so passing functions is fine.
 * Do NOT add `"use client"` here: that would force every organizer/vendor/attendee
 * list page to serialize column functions (and class instances like EventModel)
 * across the RSC boundary and crash.
 *
 * For interactive row clicks from a Client parent (e.g. OrgBoard), use
 * `ClientDataTable` instead.
 */

export interface Column<T> {
  key: string;
  header: string;
  /** "right" also switches the cell to tabular figures. Use it for every number. */
  align?: "left" | "right";
  /**
   * Tailwind width classes, e.g. "w-32" or "w-[30%] max-w-0". Omit to let the
   * column size itself.
   *
   * To make a column TRUNCATE you need both halves: a width to size it and
   * `max-w-0` to let it shrink under its content. `max-w-0` alone resolves the
   * column to literally zero width — the cell collapses, its text clips to one
   * character, and the next header renders on top of it.
   */
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
                className={`${tableHead} whitespace-nowrap pt-4 ${c.width ?? ""} ${
                  c.align === "right" ? "text-right" : ""
                } ${i === 0 ? "pl-5" : ""} ${i === columns.length - 1 ? "pr-5" : ""}`}
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
                  className={`${tableCell} ${c.width ?? ""} ${
                    c.align === "right" ? "text-right tabular-nums" : ""
                  } ${i === 0 ? "pl-5" : ""} ${i === columns.length - 1 ? "pr-5" : ""}`}
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
  primaryClassName = "truncate font-medium text-ink",
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
  /** Override primary line classes (e.g. `line-clamp-2 font-medium text-ink`). */
  primaryClassName?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={primaryClassName}>{primary}</div>
      {secondary ? <div className="truncate text-xs text-ink-soft">{secondary}</div> : null}
    </div>
  );
}
