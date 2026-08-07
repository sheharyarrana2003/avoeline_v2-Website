export default function AnalyticsLoading() {
    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <div className="h-20 animate-pulse rounded-lg border border-white/80 bg-white/70" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-lg border border-gray-200/80 bg-white/70" />
                    ))}
                </div>
                <div className="h-80 animate-pulse rounded-lg border border-gray-200/80 bg-white/70" />
            </div>
        </main>
    );
}
