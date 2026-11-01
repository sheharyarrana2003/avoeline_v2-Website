"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

const SAMPLE_CSV = `email,name,tier
alice@example.com,Alice Khan,VIP
bob@example.com,Bob Ali,
carol@example.com,,General`;

export function HowAccessWorks() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copySample() {
    void navigator.clipboard.writeText(SAMPLE_CSV).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-line bg-paper shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-ink">How access works</span>
        <ChevronDown className={`h-4 w-4 text-ink-soft transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-5 border-t border-line px-5 py-4 text-sm text-ink-soft">
          <section className="space-y-2">
            <h3 className="font-medium text-ink">Access types</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="text-ink">Public</span> — anyone with the link can register.
              </li>
              <li>
                <span className="text-ink">Private</span> — requires an access code (optional) plus
                the link.
              </li>
              <li>
                <span className="text-ink">Invite only</span> — only people on the guest list
                (invite link or whitelist email) can register.
              </li>
              <li>
                <span className="text-ink">Hybrid</span> — open for some tiers; gated tiers need
                code or guest list.
              </li>
              <li>
                <span className="text-ink">VIP / tiered</span> — attendees pick or are assigned a
                ticket tier; guest list can pin a tier.
              </li>
            </ul>
          </section>
          <section className="space-y-2">
            <h3 className="font-medium text-ink">Whitelist vs invite link</h3>
            <p>
              <span className="text-ink">Whitelist</span> matches on email at registration — no
              unique link. Status: Not registered → Registered.
            </p>
            <p>
              <span className="text-ink">Invite link</span> is a one-person URL. Status: Pending →
              Opened → Registered. You can set expiry and use limits.
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="font-medium text-ink">Recipes</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Campus open house → Public + waitlist if capacity is tight.</li>
              <li>Staff summit → Invite only + invite links with expiry.</li>
              <li>Members + VIP lounge → Hybrid: public General, gated VIP via whitelist.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h3 className="font-medium text-ink">Troubleshooting</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Guest stuck at gate → check email spelling on the whitelist, or that the invite
                token matches the URL.
              </li>
              <li>Wrong tier → edit the whitelist row tier, or send a fresh invite.</li>
              <li>Code not working → Private/Hybrid only; trim spaces; save settings again.</li>
            </ul>
          </section>
          <section className="space-y-3">
            <h3 className="font-medium text-ink">Sample guest CSV</h3>
            <p>
              Format: <code className="text-xs">email, name, tier</code> — one person per line. Name
              and tier are optional. A header row is ignored.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-line bg-muted/40 p-3 text-xs text-ink">
              {SAMPLE_CSV}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass("secondary", "sm")} onClick={copySample}>
                {copied ? "Copied" : "Copy sample"}
              </button>
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={downloadSample}
              >
                Download sample CSV
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
