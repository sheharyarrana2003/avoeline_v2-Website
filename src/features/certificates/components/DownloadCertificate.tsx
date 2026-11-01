"use client";

import { Download } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

/**
 * Download one certificate's PDF via the public on-demand route.
 */
export function DownloadCertificate({
  verificationCode,
  certificateId,
  label = "Download PDF",
  align = "end",
  className,
}: {
  /** Preferred: verification_code used in `/certificate/[code]/download`. */
  verificationCode?: string;
  /** @deprecated Accepted for older call sites; treated as code if no verificationCode. */
  certificateId?: string;
  label?: string;
  /** Kept for API compatibility; unused (link navigates directly). */
  run?: (id: string) => Promise<unknown>;
  align?: "start" | "end";
  className?: string;
}) {
  const code = String(verificationCode || certificateId || "").trim();
  if (!code) return null;

  return (
    <div className={`flex flex-col gap-1.5 ${align === "start" ? "items-start" : "items-end"}`}>
      <a
        href={`/certificate/${encodeURIComponent(code)}/download`}
        className={className ?? buttonClass("secondary", "sm")}
      >
        <Download size={13} aria-hidden="true" />
        {label}
      </a>
    </div>
  );
}
