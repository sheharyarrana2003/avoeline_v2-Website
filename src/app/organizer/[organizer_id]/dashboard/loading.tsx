// gray-200, not gray-100: the page sits on --canvas (#FAFAFA) and gray-100 against it
// is 1.04:1 — a skeleton nobody can see. gray-200 is 1.21:1, still decoration, so the
// role/aria-label below carry the loading state for anyone who cannot perceive it.
//
// Frame must stay identical to dashboard/page.tsx — same padding, max-width and
// space-y — or every navigation resolves into a different shape and reads as a bug.
// No <main> here: app/organizer/layout.tsx already renders the page's only one.
export default function DashboardLoading() {
    return (
        <div role="status" aria-label="Loading dashboard" className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-10">
                {/* Masthead: title over subtitle, actions right from sm up. */}
                <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="h-8 w-64 animate-pulse rounded-xs bg-muted-strong" />
                        <div className="mt-2 h-4 w-72 animate-pulse rounded-xs bg-muted-strong" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-11 w-32 animate-pulse rounded-lg bg-muted-strong" />
                        <div className="h-11 w-32 animate-pulse rounded-lg bg-muted-strong" />
                    </div>
                </div>

                {/* Hairline stat band, not four cards. */}
                <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="mx-0 h-14 animate-pulse rounded-xs bg-muted-strong sm:mx-6" />
                    ))}
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                    <div className="h-64 animate-pulse rounded-xs bg-muted-strong" />
                    <div className="h-48 animate-pulse rounded-xs bg-muted-strong" />
                </section>
            </div>
        </div>
    );
}
