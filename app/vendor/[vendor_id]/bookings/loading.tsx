import { Skeleton, SkeletonPage, SkeletonList } from "@/src/shared_components/ui/Skeleton";

export default function Loading() {
    return (
        <SkeletonPage label="Loading bookings">
            <Skeleton className="h-10 w-64" />
            <SkeletonList rows={4} height="h-40" />
        </SkeletonPage>
    );
}
