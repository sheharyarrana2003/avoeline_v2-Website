"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw, ArrowLeft } from "lucide-react";
import {
    RouteMessage,
    routeMessageButton,
    routeMessageLink,
} from "@/src/shared_components/ui/RouteMessage";

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // There is no error reporting service wired up here; the server log is
        // the only place this is recoverable from.
        console.error("[route error]", error);
    }, [error]);

    return (
        <RouteMessage
            icon={<TriangleAlert className="h-6 w-6" />}
            title="Something went wrong"
            description="This page failed to load. The problem has been logged — trying again often clears it."
            details={error.digest ? `Digest: ${error.digest}` : undefined}
            actions={
                <>
                    <button type="button" onClick={reset} className={routeMessageButton}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </button>
                    <Link href="/" className={routeMessageLink}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to home
                    </Link>
                </>
            }
        />
    );
}
