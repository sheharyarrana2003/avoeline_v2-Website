export default function VendorMarketplaceLoading() {
    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="h-16 animate-pulse rounded-lg border border-white/80 bg-white/70" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white/70" />
                    ))}
                </div>
            </div>
        </main>
    );
}
