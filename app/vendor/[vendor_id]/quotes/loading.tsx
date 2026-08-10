import { Skeleton, SkeletonPage, SkeletonList } from "@/src/shared_components/ui/Skeleton";

export default function Loading() {
    return (
        <SkeletonPage label="Loading quotes">
            <Skeleton className="h-10 w-64" />
            <SkeletonList rows={4} height="h-32" />
        </SkeletonPage>
    );
}
