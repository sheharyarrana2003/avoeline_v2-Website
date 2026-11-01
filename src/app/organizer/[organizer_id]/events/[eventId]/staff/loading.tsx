export default function StaffLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true">
      <div className="h-7 w-28 animate-pulse rounded-xs bg-muted-strong" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted-strong" />
        ))}
      </div>
    </div>
  );
}
