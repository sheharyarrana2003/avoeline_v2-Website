import { TicketingService } from "@/src/features/ticketing/ticketing.service";
import {
  createPromoCode,
  createTicketTier,
  deletePromoCode,
  deleteTicketTier,
  togglePromoCode,
  toggleTicketTier,
} from "@/src/features/ticketing/actions/ticketing.action";
import { listTracks } from "@/src/features/hackathon/hackathon.service";
import { buttonClass } from "@/src/lib/ui";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { formatDate } from "@/src/lib/datetime";
import { PromoFieldGrid, TierFieldGrid } from "./TiersAndPromosEditor";

export async function TiersPromosOnAccess({
  eventId,
  organizerId,
  error,
  success,
  isHackathon = false,
  title = "Tiers & promos",
}: {
  eventId: string;
  organizerId: string;
  error?: string;
  success?: string;
  isHackathon?: boolean;
  /** Card title (e.g. stepped flow on Access tab). */
  title?: string;
}) {
  const [tiers, promos, tracks] = await Promise.all([
    TicketingService.listTiers(eventId),
    TicketingService.listPromos(eventId),
    isHackathon ? listTracks(eventId) : Promise.resolve([]),
  ]);
  const returnTo = `/organizer/${organizerId}/events/${eventId}/access`;
  const hidden = (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
  const trackOpts = tracks.map((t) => ({ id: t.id, name: t.name }));

  return (
    <Card title={title}>
      <CardBody className="space-y-8">
        <FormFeedback error={error} success={success} />
        <p className="text-sm text-ink-soft">
          Paid registration uses these SKUs on the public Register page. Promo codes apply at
          checkout.
        </p>

        {isHackathon ? (
          <p className="rounded-xl border border-line bg-muted px-4 py-3 text-sm text-ink-soft">
            Hackathon fees are set per competition — see the Competitions tab.
          </p>
        ) : (
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-ink">Ticket tiers</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {tiers.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-ink-soft">
                      {t.price === 0 ? "Free" : t.price} · {t.seatsSold}/{t.seatsAvailable ?? "∞"}{" "}
                      sold
                      {t.isEarlyBird ? " · early bird" : ""}
                      {t.availableFrom ? ` · from ${formatDate(t.availableFrom)}` : ""}
                      {t.availableUntil ? ` · until ${formatDate(t.availableUntil)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={toggleTicketTier}>
                      {hidden}
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="active" value={t.active ? "off" : "on"} />
                      <button type="submit" className={buttonClass("secondary", "sm")}>
                        {t.active ? "Active" : "Inactive"}
                      </button>
                    </form>
                    <form action={deleteTicketTier}>
                      {hidden}
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className={buttonClass("ghost", "sm")}>
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
              {tiers.length === 0 ? (
                <li className="px-4 py-3 text-sm text-ink-soft">No tiers yet.</li>
              ) : null}
            </ul>
            <form
              action={createTicketTier}
              className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
            >
              {hidden}
              <TierFieldGrid idPrefix="tier" />
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={buttonClass("primary", "sm")}>
                  Add tier
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-ink">Promo codes</h3>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {promos.map((p) => {
              const off = p.discountType === "percent" ? `${p.value}% off` : `Rs ${p.value} off`;
              const scope = p.trackId
                ? (tracks.find((t) => t.id === p.trackId)?.name ?? "Competition")
                : "Whole event";
              const usage =
                p.usageLimit != null
                  ? `${p.usageCount} / ${p.usageLimit} used`
                  : `${p.usageCount} used`;
              const discounted =
                p.totalDiscounted > 0
                  ? ` · Rs ${p.totalDiscounted.toLocaleString()} discounted`
                  : "";
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-mono font-medium text-ink">{p.code}</p>
                    <p className="text-xs text-ink-soft">
                      {off} · {scope} · {usage}
                      {discounted}
                      {p.expiresAt ? ` · expires ${formatDate(p.expiresAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={togglePromoCode}>
                      {hidden}
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? "off" : "on"} />
                      <button type="submit" className={buttonClass("secondary", "sm")}>
                        {p.active ? "Active" : "Inactive"}
                      </button>
                    </form>
                    <form action={deletePromoCode}>
                      {hidden}
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className={buttonClass("ghost", "sm")}>
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
            {promos.length === 0 ? (
              <li className="px-4 py-3 text-sm text-ink-soft">No codes yet.</li>
            ) : null}
          </ul>
          <form
            action={createPromoCode}
            className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
          >
            {hidden}
            <PromoFieldGrid idPrefix="promo" isHackathon={isHackathon} tracks={trackOpts} />
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className={buttonClass("primary", "sm")}>
                Add code
              </button>
            </div>
          </form>
        </section>
      </CardBody>
    </Card>
  );
}
