import { Skeleton, SkeletonList, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function EventAccessLoading() {
    return (
        <SkeletonPage label="Loading access settings">
            <Skeleton className="h-64 w-full" />
            <SkeletonList rows={4} height="h-14" />
        </SkeletonPage>
    );
}
