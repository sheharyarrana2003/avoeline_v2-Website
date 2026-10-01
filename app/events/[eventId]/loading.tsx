import { Skeleton, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function PublicEventLoading() {
    return (
        <SkeletonPage label="Loading event">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-6">
                    <Skeleton className="aspect-video w-full" />
                    <Skeleton className="h-9 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-[26rem] w-full" />
            </div>
        </SkeletonPage>
    );
}
