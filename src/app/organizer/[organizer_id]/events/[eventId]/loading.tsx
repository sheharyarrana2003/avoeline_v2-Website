export default function EventDetailLoading() {
    return (
        // The event layout already pads this slot; a second px/py here inset the
        // skeleton from where the real page actually starts.
        <div className="mx-auto max-w-7xl space-y-10">
            <div className="h-72 animate-pulse rounded-2xl bg-muted-strong" />
            <div className="grid grid-cols-2 gap-8 border-y border-line py-8 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xs bg-muted-strong" />
                ))}
            </div>
            <div className="grid gap-10 lg:grid-cols-3">
                <div className="h-64 animate-pulse rounded-2xl bg-muted-strong lg:col-span-2" />
                <div className="h-64 animate-pulse rounded-2xl bg-muted-strong" />
            </div>
        </div>
    );
}
