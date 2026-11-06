"use client";

import { useState } from "react";

export function BlockedByAdminBanner({ note }: { note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      role="alert"
      className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-medium">Your organization&apos;s Google admin must allow this app.</p>
      <p className="text-xs">
        Copy the note below for your Workspace admin, or connect a personal Gmail instead.
      </p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-amber-200 bg-paper/80 p-2 text-[11px] text-ink">
        {note}
      </pre>
      <button
        type="button"
        className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(note);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy note"}
      </button>
    </div>
  );
}
