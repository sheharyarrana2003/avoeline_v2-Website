"use client";

import type { ReactNode } from "react";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";
import type { Column } from "./DataTable";

/**
 * Client variant of DataTable for interactive row clicks.
 * Safe only when the parent is already a Client Component (functions never
 * cross the RSC boundary). Server pages must keep using `DataTable`.
 */
export function ClientDataTable<T>({
  rows,
  columns,
  getKey,
  empty,
  caption,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T, index: number) => string;
  empty?: ReactNode;
  caption?: string;
  onRowClick?: (row: T) => void;
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
            <tr
              key={getKey(row, rowIndex)}
              className={`${tableRow}${onRowClick ? " cursor-pointer" : ""}`}
              onClick={
                onRowClick
                  ? (e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest("a, button, input, select, textarea, label")) return;
                      onRowClick(row);
                    }
                  : undefined
              }
            >
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
