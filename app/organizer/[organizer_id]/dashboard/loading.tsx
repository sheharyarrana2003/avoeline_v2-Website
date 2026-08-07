export default function DashboardLoading() {
    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <div className="h-24 animate-pulse rounded-lg border border-white/80 bg-white/70" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-lg border border-slate-200/80 bg-white/70" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.95fr)]">
                    <div className="h-96 animate-pulse rounded-lg border border-slate-200/80 bg-white/70" />
                    <div className="h-96 animate-pulse rounded-lg border border-slate-200/80 bg-white/70" />
                </div>
            </div>
        </main>
    );
}
