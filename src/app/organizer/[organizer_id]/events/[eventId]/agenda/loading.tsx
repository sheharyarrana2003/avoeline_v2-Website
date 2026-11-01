export default function AgendaLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true">
      <div className="h-7 w-36 animate-pulse rounded-xs bg-muted-strong" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted-strong" />
        ))}
      </div>
    </div>
  );
}
