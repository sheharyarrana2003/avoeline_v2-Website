import { Skeleton, SkeletonList, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function EventsLoading() {
    return (
        <SkeletonPage label="Loading events">
            <Skeleton className="h-16 w-full" />
            <SkeletonList rows={5} height="h-28" />
        </SkeletonPage>
    );
}
