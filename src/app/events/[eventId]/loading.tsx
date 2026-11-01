export default function PublicEventLoading() {
  return (
    <main className="w-full animate-pulse">
      <div className="min-h-[280px] w-full bg-muted sm:min-h-[360px]" />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="h-8 w-2/3 rounded-lg bg-muted" />
          <div className="h-24 w-full rounded-xl bg-muted" />
          <div className="h-40 w-full rounded-xl bg-muted" />
        </div>
        <div className="h-72 rounded-2xl border border-line bg-muted/60" />
      </div>
    </main>
  );
}
