"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import type { ExportResult } from "@/src/features/exports/types";

/**
 * Ask the server to build a file, then open the signed URL it hands back.
 *
 * Not a `<form action={}>`: a Server Action cannot return a file, and this app
 * has no API routes to stream one from. The action writes the file to private
 * storage and returns a short-lived link, so the click that starts the export is
 * not the click that downloads it — hence the transition state and the inline
 * error, rather than letting a failure look like nothing happened.
 */
export function ExportButton({
    run,
    label = "Export CSV",
}: {
    run: () => Promise<ExportResult>;
    label?: string;
}) {
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="flex flex-col items-end gap-2">
            <button
                type="button"
                disabled={pending}
                className={buttonClass("secondary", "sm")}
                onClick={() =>
                    start(async () => {
                        setError(null);
                        try {
                            const result = await run();
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
                <Download size={14} aria-hidden="true" />
                {pending ? "Preparing…" : label}
            </button>
            {error ? <FormFeedback error={error} /> : null}
        </div>
    );
}
