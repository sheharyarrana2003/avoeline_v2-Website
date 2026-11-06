import { applyOrganizerUnsubscribe } from "@/src/features/connections/server/suppressions.service";

export default async function OrganizerUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let message = "Missing unsubscribe token.";
  let ok = false;
  if (token) {
    const result = await applyOrganizerUnsubscribe(token);
    if (result.ok) {
      ok = true;
      message = `You have been unsubscribed. You will no longer receive bulk updates from this organizer at ${result.email}.`;
    } else {
      message = result.error;
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-2xl text-ink">Unsubscribe</h1>
      <p className={`mt-4 text-sm ${ok ? "text-ink" : "text-danger"}`}>{message}</p>
      <p className="mt-2 text-xs text-ink-soft">
        Transactional messages (tickets, confirmations, access codes) are not affected.
      </p>
    </main>
  );
}
