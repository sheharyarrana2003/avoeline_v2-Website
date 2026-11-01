"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

export type MultiOption = { value: string; label: string };

export function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const count = selected.length;
  const triggerLabel = count ? `${label} · ${count}` : label;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        {triggerLabel}
        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" aria-hidden />
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 z-30 mt-1 max-h-64 min-w-[12rem] overflow-auto rounded-xl border border-line bg-paper p-2 shadow-lg"
        >
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    onChange(
                      checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value],
                    );
                  }}
                  className="rounded border-line"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
