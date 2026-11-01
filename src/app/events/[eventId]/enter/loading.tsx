export default function EnterLoading() {
  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-4 py-16 sm:px-6" aria-busy="true">
      <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-6 h-24 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}
