"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { downloadCertificate } from "../actions/downloadCertificate.action";
import type { ExportResult } from "@/src/features/exports/types";

/**
 * Download one certificate's PDF.
 *
 * Not a link: the file sits in a private bucket, so the URL has to be signed
 * per click and cannot be baked into the page at render time. The action returns
 * the signed link and the browser follows it.
 *
 * `run` exists because the public verification page needs the same button
 * against the unauthenticated action. Passing the action in beats a second copy
 * of the component, and keeps which-rule-applies a decision the server makes.
 */
export function DownloadCertificate({
    certificateId,
    label = "Download PDF",
    run = downloadCertificate,
    align = "end",
    className,
}: {
    certificateId: string;
    label?: string;
    run?: (certificateId: string) => Promise<ExportResult>;
    align?: "start" | "end";
    className?: string;
}) {
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);

    return (
        <div className={`flex flex-col gap-1.5 ${align === "start" ? "items-start" : "items-end"}`}>
            <button
                type="button"
                disabled={pending}
                className={className ?? buttonClass("secondary", "sm")}
                onClick={() =>
                    start(async () => {
                        setError(null);
                        try {
                            const result = await run(certificateId);
                            if (!result.success || !result.url) {
                                setError(result.error ?? "Could not prepare the download.");
                                return;
                            }
                            // Same tab: a popup blocker eats window.open() when the
                            // click and the navigation are separated by an await.
                            window.location.href = result.url;
                        } catch {
                            setError("Could not reach the server. Please try again.");
                        }
                    })
                }
            >
                <Download size={13} aria-hidden="true" />
                {pending ? "Preparing…" : label}
            </button>
            {error ? <FormFeedback error={error} /> : null}
        </div>
    );
}
