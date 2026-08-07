"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TriangleAlert, SearchX, RotateCcw, LayoutDashboard } from "lucide-react";
import { RouteMessage, routeMessageButton, routeMessageLink } from "./RouteMessage";

/**
 * Both dashboards nest the role id in the route, so the way back is derivable
 * rather than something each boundary has to be told. Organizer is checked
 * first because `vendor_id` also appears under
 * `/organizer/<id>/view-vendor/<vendor_id>`, where the organizer's own
 * dashboard is still the right destination.
 */
function useDashboardHref(): string {
    const params = useParams<{ organizer_id?: string; vendor_id?: string }>();
    if (params?.organizer_id) return `/organizer/${params.organizer_id}/dashboard`;
    if (params?.vendor_id) return `/vendor/${params.vendor_id}/dashboard`;
    return "/";
}

export function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const href = useDashboardHref();

    useEffect(() => {
        console.error("[dashboard error]", error);
    }, [error]);

    return (
        <RouteMessage
            icon={<TriangleAlert className="h-6 w-6" />}
            title="This page didn't load"
            description="Something failed while fetching your data. Nothing was changed — trying again is safe."
            details={error.digest ? `Digest: ${error.digest}` : undefined}
            actions={
                <>
                    <button type="button" onClick={reset} className={routeMessageButton}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </button>
                    <Link href={href} className={routeMessageLink}>
                        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                        Go to dashboard
                    </Link>
                </>
            }
        />
    );
}

export function DashboardNotFound() {
    const href = useDashboardHref();

    return (
        <RouteMessage
            tone="neutral"
            icon={<SearchX className="h-6 w-6" />}
            title="Not found"
            description="This record doesn't exist, or it isn't yours to view. It may have been deleted since the link was created."
            actions={
                <Link href={href} className={routeMessageButton}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Go to dashboard
                </Link>
            }
        />
    );
}
