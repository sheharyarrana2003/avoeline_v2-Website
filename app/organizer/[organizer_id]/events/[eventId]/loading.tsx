export default function EventDetailLoading() {
    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white/70" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white/70 lg:col-span-2" />
                    <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white/70" />
                </div>
            </div>
        </div>
    );
}
