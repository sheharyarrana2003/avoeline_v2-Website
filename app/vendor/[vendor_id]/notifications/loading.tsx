import { Skeleton, SkeletonPage, SkeletonList } from "@/src/shared_components/ui/Skeleton";

export default function Loading() {
    return (
        <SkeletonPage label="Loading notifications">
            <Skeleton className="h-10 w-64" />
            <SkeletonList rows={6} height="h-20" />
        </SkeletonPage>
    );
}
