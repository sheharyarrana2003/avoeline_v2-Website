import { Skeleton, SkeletonList, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function BrowseEventsLoading() {
    return (
        <SkeletonPage label="Loading events">
            <Skeleton className="h-10 w-64" />
            <SkeletonList rows={4} height="h-40" />
        </SkeletonPage>
    );
}
