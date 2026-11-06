import { countDelayedConfirmations } from "../server/capacity.service";

export async function DelayedConfirmationsBanner({ ownerId }: { ownerId: string }) {
  const n = await countDelayedConfirmations(ownerId).catch(() => 0);
  if (n <= 0) return null;
  return (
    <p
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      {n} confirmation{n === 1 ? "" : "s"} delayed — waiting for send capacity. Ticket and status
      pages still work as the fallback.
    </p>
  );
}
