"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

export function CopyShortCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  if (!code) return <span className="font-mono text-sm text-ink">—</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm tracking-wide text-ink">{code}</span>
      <button
        type="button"
        className={buttonClass("ghost", "sm")}
        aria-label="Copy short code"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
