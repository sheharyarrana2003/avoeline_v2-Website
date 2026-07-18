export default function CertificatesLoading() {
    return (
        <div className="min-h-screen bg-[#f8f9fa] p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="h-9 w-64 animate-pulse rounded bg-gray-200" />
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-100 bg-white" />
                    ))}
                </div>
            </div>
        </div>
    );
}
