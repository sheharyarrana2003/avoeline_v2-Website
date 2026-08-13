// Must match the loaded frame: header, then the four-up stat band, then the two
// columns. The old fallback drew four bordered cards, which is the shape the
// dashboard no longer has — resolving into a different layout reads as a bug.
//
// gray-200 fill: the page sits on --canvas (#FAFAFA), where gray-100 is 1.04:1
// and effectively invisible. gray-200 is 1.21:1, still decoration, so role and
// aria-label carry the state.
export default function VendorDashboardLoading() {
    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8" role="status" aria-label="Loading dashboard">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 border-b border-line pb-6">
                    <div className="h-9 w-72 max-w-full animate-pulse rounded-xs bg-muted-strong" />
                </div>

                <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="mx-0 h-14 animate-pulse rounded-xs bg-muted-strong sm:mx-6" />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                        <div className="h-80 animate-pulse rounded-xs bg-muted-strong" />
                        <div className="h-48 animate-pulse rounded-xs bg-muted-strong" />
                    </div>
                </div>
            </div>
        </div>
    );
}
