export default function EventsLoading() {
    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="h-16 animate-pulse rounded-lg border border-white/80 bg-white/70" />
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white/70" />
                    ))}
                </div>
            </div>
        </main>
    );
}
