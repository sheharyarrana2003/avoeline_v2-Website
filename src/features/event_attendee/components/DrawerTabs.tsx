"use client";

import type { ReactNode } from "react";

export function DrawerTabs({
  tab,
  onTab,
  details,
  communication,
}: {
  tab: "details" | "communication";
  onTab: (tab: "details" | "communication") => void;
  details: ReactNode;
  communication: ReactNode;
}) {
  return (
    <div>
      <div className="flex gap-1 border-b border-line">
        <button
          type="button"
          onClick={() => onTab("details")}
          className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${tab === "details" ? "border-b-2 border-ink text-ink" : "text-ink-soft"}`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => onTab("communication")}
          className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${tab === "communication" ? "border-b-2 border-ink text-ink" : "text-ink-soft"}`}
        >
          Communication
        </button>
      </div>
      <div className="pt-5">{tab === "details" ? details : communication}</div>
    </div>
  );
}
