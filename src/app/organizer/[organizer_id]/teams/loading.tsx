import { Skeleton, SkeletonPage } from "@/src/shared_components/ui/Skeleton";

export default function OrganizerTeamsLoading() {
  return (
    <SkeletonPage label="Loading teams">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-0 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-none" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </SkeletonPage>
  );
}
