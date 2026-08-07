export default function EventDetailLoading() {
    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white/70" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white/70 lg:col-span-2" />
                    <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white/70" />
                </div>
            </div>
        </main>
    );
}
