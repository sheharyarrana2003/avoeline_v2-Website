export default function ExpensesLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true">
      <div className="h-7 w-40 animate-pulse rounded-xs bg-muted-strong" />
      <div className="grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xs bg-muted-strong" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted-strong" />
        ))}
      </div>
    </div>
  );
}
