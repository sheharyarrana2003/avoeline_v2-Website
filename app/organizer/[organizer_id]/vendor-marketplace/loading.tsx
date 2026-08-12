import { Skeleton, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function VendorMarketplaceLoading() {
    return (
        <SkeletonPage label="Loading providers">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
            </div>
        </SkeletonPage>
    );
}
