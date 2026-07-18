export default function AttendeesLoading() {
    return (
        <div className="min-h-screen bg-[#f8f9fa] p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="h-9 w-72 animate-pulse rounded bg-gray-200" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white" />
                    ))}
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg border border-gray-100 bg-white" />
                    ))}
                </div>
            </div>
        </div>
    );
}
