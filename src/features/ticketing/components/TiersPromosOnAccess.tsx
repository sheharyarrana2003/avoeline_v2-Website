import { TicketingService } from "@/src/features/ticketing/ticketing.service";
import { createPromoCode, createTicketTier } from "@/src/features/ticketing/actions/ticketing.action";
import { listTracks } from "@/src/features/hackathon/hackathon.service";
import { buttonClass } from "@/src/lib/ui";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

export async function TiersPromosOnAccess({
  eventId,
  organizerId,
  error,
  success,
  isHackathon = false,
}: {
  eventId: string;
  organizerId: string;
  error?: string;
  success?: string;
  isHackathon?: boolean;
}) {
  const [tiers, promos, tracks] = await Promise.all([
    TicketingService.listTiers(eventId),
    TicketingService.listPromos(eventId),
    isHackathon ? listTracks(eventId) : Promise.resolve([]),
  ]);
  const returnTo = `/organizer/${organizerId}/events/${eventId}/access`;

  return (
    <Card title="Tiers & promos">
      <CardBody>
        <FormFeedback error={error} success={success} />
        <p className="mb-4 text-sm text-ink-soft">
          Paid registration uses these SKUs on the public Register page. Promo codes apply at checkout.
        </p>
        <h3 className="text-sm font-medium text-ink">Ticket tiers</h3>
        <ul className="mt-2 divide-y divide-line">
          {tiers.map((t) => (
            <li key={t.id} className="flex justify-between py-2 text-sm">
              <span className="font-medium">{t.name}</span>
              <span>
                {t.price === 0 ? "Free" : t.price} · {t.seatsSold}/{t.seatsAvailable ?? "∞"} sold
              </span>
            </li>
          ))}
          {tiers.length === 0 ? <li className="py-2 text-ink-soft">No tiers yet.</li> : null}
        </ul>
        <form action={createTicketTier} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input name="name" placeholder="Name" className="rounded-md border border-line px-3 py-2 text-sm" required />
          <input name="price" type="number" step="0.01" placeholder="Price" className="w-28 rounded-md border border-line px-3 py-2 text-sm" />
          <input name="seats" type="number" placeholder="Seats" className="w-24 rounded-md border border-line px-3 py-2 text-sm" />
          <button type="submit" className={buttonClass("primary", "sm")}>
            Add tier
          </button>
        </form>
        <h3 className="mt-6 text-sm font-medium text-ink">Promo codes</h3>
        <ul className="mt-2 divide-y divide-line">
          {promos.map((p) => (
            <li key={p.id} className="flex justify-between py-2 text-sm">
              <span className="font-mono">{p.code}</span>
              <span>
                {p.discountType === "percent" ? `${p.value}%` : p.value} · {p.usageCount}/{p.usageLimit ?? "∞"}
                {p.trackId ? ` · ${tracks.find((t) => t.id === p.trackId)?.name ?? "Competition"}` : " · Whole event"}
              </span>
            </li>
          ))}
          {promos.length === 0 ? <li className="py-2 text-ink-soft">No codes yet.</li> : null}
        </ul>
        <form action={createPromoCode} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input name="code" placeholder="CODE" className="rounded-md border border-line px-3 py-2 text-sm uppercase" required />
          <select name="discountType" className="rounded-md border border-line px-3 py-2 text-sm">
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </select>
          <input name="value" type="number" step="0.01" placeholder="Value" className="w-24 rounded-md border border-line px-3 py-2 text-sm" required />
          {isHackathon && tracks.length ? (
            <select name="trackId" className="rounded-md border border-line px-3 py-2 text-sm" defaultValue="">
              <option value="">Whole event</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : null}
          <button type="submit" className={buttonClass("primary", "sm")}>
            Add code
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
