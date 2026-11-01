"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { fieldClass, labelClass } from "@/src/lib/ui";

export function BenefitChips({ name, initial }: { name: string; initial: string[] }) {
  const [items, setItems] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const next = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!next.length) return;
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.toLowerCase()));
      const extra = next.filter((n) => !seen.has(n.toLowerCase()));
      return extra.length ? [...prev, ...extra] : prev;
    });
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="org-benefits" className={labelClass}>
        Benefits owed
      </label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2.5 py-1 text-xs text-ink"
          >
            {label}
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={() => setItems((prev) => prev.filter((x) => x !== label))}
              className="rounded-full p-0.5 text-ink-soft hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        id="org-benefits"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
        placeholder="Type a benefit and press Enter"
        className={fieldClass}
      />
      <p className="text-xs text-ink-soft">
        Press Enter or comma to add. Editing keeps whatever you have already ticked off as
        delivered.
      </p>
      <textarea name={name} value={items.join("\n")} readOnly hidden className="hidden" />
    </div>
  );
}
