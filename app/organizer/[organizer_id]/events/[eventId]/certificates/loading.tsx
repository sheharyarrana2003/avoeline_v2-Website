export default function CertificatesLoading() {
    return (
        // No outer padding: the event layout already supplies it.
        <div className="mx-auto max-w-7xl space-y-8">
            <div className="h-7 w-56 animate-pulse rounded-xs bg-gray-200" />
            <div className="grid grid-cols-2 gap-8 border-y border-line py-8 sm:grid-cols-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xs bg-gray-200" />
                ))}
            </div>
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
                ))}
            </div>
        </div>
    );
}
