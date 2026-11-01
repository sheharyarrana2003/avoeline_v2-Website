import Link from "next/link";
import { withdrawByToken } from "@/src/features/website/consent.service";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let status: "ok" | "missing" | "error" = "missing";
  let message = "Missing unsubscribe token.";

  if (token?.trim()) {
    const result = await withdrawByToken(token.trim());
    if (result.ok) {
      status = "ok";
      message = `You have been unsubscribed (${result.scope}). You will no longer receive Avoeline community updates at this address.`;
    } else {
      status = "error";
      message = result.error;
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-[var(--mkt-ink)]">Unsubscribe</h1>
      <p className="mt-4 text-[var(--mkt-muted)]">{message}</p>
      {status === "ok" ? (
        <p className="mt-2 text-sm text-[var(--mkt-muted)]">
          You can opt in again later from signup or an event registration form.
        </p>
      ) : null}
      <p className="mt-8">
        <Link
          href="/"
          className="font-medium text-[var(--mkt-accent)] underline-offset-2 hover:underline"
        >
          Back to home
        </Link>
      </p>
    </main>
  );
}
