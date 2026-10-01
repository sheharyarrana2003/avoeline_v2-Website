import { Skeleton, SkeletonList, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function EventSponsorsLoading() {
    return (
        <SkeletonPage label="Loading sponsors and partners">
            <Skeleton className="h-64 w-full" />
            <SkeletonList rows={3} height="h-28" />
        </SkeletonPage>
    );
}
