"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

/**
 * Copyable share URL for the public event page (short `/e/[id]` or full path).
 */
export function ShareEventLink({ url, label = "Shareable link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — leave button state alone */
    }
  };

  return (
    <div className="rounded-xl border border-line bg-muted/40 px-3 py-2.5">
      <p className="text-2xs font-medium uppercase text-ink-soft">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={url}>
          {url}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-ink-soft" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink"
          title="Copy link"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
