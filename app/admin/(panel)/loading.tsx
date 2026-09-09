import { Skeleton, SkeletonList, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function AdminCategoriesLoading() {
    return (
        <SkeletonPage label="Loading event categories">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
            <SkeletonList rows={5} height="h-14" />
        </SkeletonPage>
    );
}
