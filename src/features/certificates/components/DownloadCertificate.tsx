"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { downloadCertificate } from "../actions/downloadCertificate.action";

/**
 * Download one certificate's PDF.
 *
 * Not a link: the file sits in a private bucket, so the URL has to be signed
 * per click and cannot be baked into the page at render time. The action returns
 * the signed link and the browser follows it.
 */
export function DownloadCertificate({
    certificateId,
    label = "Download PDF",
}: {
    certificateId: string;
    label?: string;
}) {
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-end gap-1.5">
            <button
                type="button"
                disabled={pending}
                className={buttonClass("secondary", "sm")}
                onClick={() =>
                    start(async () => {
                        setError(null);
                        try {
                            const result = await downloadCertificate(certificateId);
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
