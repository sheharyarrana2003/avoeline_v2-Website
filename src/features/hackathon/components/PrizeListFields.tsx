"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export type PrizeDraft = {
  positionLabel: string;
  amount: string;
  description: string;
};

export function PrizeListFields({ initial = [] }: { initial?: PrizeDraft[] }) {
  const [rows, setRows] = useState<PrizeDraft[]>(
    initial.length ? initial : [{ positionLabel: "1st", amount: "", description: "" }],
  );

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor={`prize-pos-${i}`}>
              Position
            </label>
            <input
              id={`prize-pos-${i}`}
              name="prizePosition"
              value={row.positionLabel}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, positionLabel: e.target.value } : r)),
                )
              }
              placeholder="1st"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor={`prize-amt-${i}`}>
              Amount
            </label>
            <input
              id={`prize-amt-${i}`}
              name="prizeAmount"
              value={row.amount}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)),
                )
              }
              placeholder="Rs 50,000"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-5">
            <label className={labelClass} htmlFor={`prize-desc-${i}`}>
              Description
            </label>
            <input
              id={`prize-desc-${i}`}
              name="prizeDescription"
              value={row.description}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, idx) => (idx === i ? { ...r, description: e.target.value } : r)),
                )
              }
              placeholder="Optional"
              className={fieldClass}
            />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              aria-label="Remove prize"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-lg p-2 text-ink-soft hover:bg-muted hover:text-ink"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows((prev) => [...prev, { positionLabel: "", amount: "", description: "" }])
        }
        className={buttonClass("secondary", "sm")}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another prize
      </button>
    </div>
  );
}
