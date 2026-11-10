export default function PublicEventLoading() {
  return (
    <main className="w-full animate-pulse">
      <div className="aspect-video w-full bg-muted md:aspect-[21/9]" />
      <div className="mx-auto -mt-6 w-full max-w-6xl px-4 sm:-mt-8 sm:px-6">
        <div className="h-40 rounded-2xl border border-line bg-muted/80" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="order-2 space-y-6 lg:order-1">
          <div className="h-8 w-2/3 rounded-lg bg-muted" />
          <div className="h-24 w-full rounded-xl bg-muted" />
          <div className="h-40 w-full rounded-xl bg-muted" />
        </div>
        <div className="order-1 h-72 rounded-2xl border border-line bg-muted/60 lg:order-2" />
      </div>
    </main>
  );
}
