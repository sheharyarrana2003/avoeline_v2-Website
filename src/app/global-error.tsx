"use client";

import { useEffect } from "react";

/**
 * Last resort: this replaces the root layout, so it renders its own document
 * and cannot assume globals.css was ever applied. Everything here is inline on
 * purpose.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[global error]", error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#fafafa",
                    color: "#171717",
                    fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                    padding: "1rem",
                }}
            >
                <div style={{ maxWidth: "28rem", textAlign: "center" }}>
                    <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                        Something went wrong
                    </h1>
                    <p
                        style={{
                            marginTop: "0.5rem",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            color: "#6b7280",
                        }}
                    >
                        Avoeline could not finish loading. Reloading usually clears it.
                    </p>
                    {error.digest ? (
                        <p style={{ marginTop: "0.75rem", fontSize: "0.6875rem", color: "#9ca3af" }}>
                            Digest: {error.digest}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            marginTop: "1.75rem",
                            padding: "0.625rem 1.25rem",
                            borderRadius: "9999px",
                            border: "none",
                            backgroundColor: "#000",
                            color: "#fff",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
