"use client";

import { formatTimeDisplay, to24h } from "./wizardUtils";

export function TimeField({
  id,
  label,
  value,
  hour12,
  onHour12Change,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  hour12: boolean;
  onHour12Change: (next: boolean) => void;
  onChange: (value: string) => void;
}) {
  const stored = to24h(value) || "10:00";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-xs text-ink-soft">
          {label}
        </label>
        <div className="flex rounded-full border border-line bg-muted p-0.5 text-2xs font-semibold">
          <button
            type="button"
            onClick={() => onHour12Change(true)}
            className={`rounded-full px-2 py-0.5 ${hour12 ? "bg-paper text-ink shadow-sm" : "text-ink-soft"}`}
          >
            12h
          </button>
          <button
            type="button"
            onClick={() => onHour12Change(false)}
            className={`rounded-full px-2 py-0.5 ${hour12 ? "text-ink-soft" : "bg-paper text-ink shadow-sm"}`}
          >
            24h
          </button>
        </div>
      </div>
      <input
        id={id}
        type="time"
        value={stored}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-line"
      />
      <p className="mt-1 text-2xs text-ink-soft">Shown as {formatTimeDisplay(stored, hour12) || stored}</p>
    </div>
  );
}
