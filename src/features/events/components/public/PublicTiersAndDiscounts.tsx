import { formatCurrency } from "@/src/lib/money";
import { formatDateMedium } from "@/src/lib/datetime";
import type { PublicEventDto } from "@/src/features/events/types";

/** Public pricing tiers + automatic student/group discounts (no promo material). */
export function PublicTiersAndDiscounts({ dto }: { dto: PublicEventDto }) {
  if (dto.isHackathon) return null;
  if (!dto.pricingTiers.length && !dto.discounts.length) {
    return null;
  }
  if (dto.isFree && !dto.discounts.length && dto.pricingTiers.every((t) => t.price <= 0)) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg text-ink">Tickets &amp; discounts</h2>
      {dto.pricingTiers.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {dto.pricingTiers.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">{t.name}</p>
                <p className="shrink-0 font-display text-base text-ink">
                  {formatCurrency(t.price, dto.currency, "Free")}
                </p>
              </div>
              {t.description ? (
                <p className="mt-1 break-words text-xs text-ink-soft">{t.description}</p>
              ) : null}
              <ul className="mt-3 space-y-1 text-2xs text-ink-faint">
                {t.availableUntil ? (
                  <li>Available until {formatDateMedium(t.availableUntil)}</li>
                ) : (
                  <li>Available now</li>
                )}
                {t.seatsLeft != null ? (
                  <li>
                    {t.seatsLeft} seat{t.seatsLeft === 1 ? "" : "s"} left
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}

      {dto.discounts.length ? (
        <ul className="space-y-2">
          {dto.discounts.map((d) => (
            <li
              key={d.kind}
              className="rounded-xl border border-line bg-muted/40 px-4 py-3 text-sm text-ink"
            >
              {d.kind === "student" ? (
                <>
                  Student discount: <strong>{d.percentage}%</strong>
                  {d.requiresVerification ? " (verification required)" : ""}
                </>
              ) : (
                <>
                  Group discount: <strong>{d.percentage}%</strong>
                  {d.minGroupSize ? ` for groups of ${d.minGroupSize}+` : ""}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
