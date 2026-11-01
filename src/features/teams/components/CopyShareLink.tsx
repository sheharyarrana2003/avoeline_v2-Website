"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

export function CopyShareLink({ url, showQr = true }: { url: string; showQr?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!showQr || !url) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void import("qrcode")
      .then((QRCode) => QRCode.toDataURL(url, { width: 128, margin: 1 }))
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, showQr]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs shadow-2xs">
        <span className="text-ink-soft">Link:</span>
        <span className="max-w-[14rem] truncate font-mono text-ink">{url}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md p-1 text-ink-soft transition hover:bg-muted hover:text-ink"
          title="Copy application link"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink shadow-2xs transition hover:bg-muted"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Link Copied</span>
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5 text-ink-soft" />
            <span>Copy Link</span>
          </>
        )}
      </button>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt="QR code for application link"
          className="h-16 w-16 rounded-lg border border-line"
        />
      ) : null}
    </div>
  );
}
