import { Skeleton, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function AnalyticsLoading() {
    return (
        <SkeletonPage label="Loading analytics">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
            <Skeleton className="h-80 w-full" />
        </SkeletonPage>
    );
}
