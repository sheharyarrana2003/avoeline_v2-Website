import { Skeleton, SkeletonList, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function AttendeeDashboardLoading() {
    return (
        <SkeletonPage label="Loading your events">
            <Skeleton className="h-10 w-full" />
            <SkeletonList rows={3} height="h-14" />
        </SkeletonPage>
    );
}
