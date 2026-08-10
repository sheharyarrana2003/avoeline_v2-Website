/**
 * Loading placeholders. Only 12 of 43 routes had a loading.tsx, so most of the
 * app showed nothing at all while its data resolved -- and Server Actions here
 * take around six seconds in development.
 *
 * The whole group is aria-busy and aria-hidden: a screen reader should hear
 * "loading" once from the region, not read out a dozen empty grey boxes.
 */
export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

export function SkeletonPage({
    label = "Loading",
    children,
}: {
    label?: string;
    children: React.ReactNode;
}) {
    return (
        <main className="px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
            <span className="sr-only">{label}…</span>
            <div className="mx-auto max-w-7xl space-y-6" aria-hidden="true">
                {children}
            </div>
        </main>
    );
}

/** A stack of card placeholders, the shape most list routes need. */
export function SkeletonList({ rows = 4, height = "h-24" }: { rows?: number; height?: string }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className={`w-full ${height}`} />
            ))}
        </div>
    );
}
