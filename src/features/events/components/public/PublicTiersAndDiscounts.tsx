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
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {dto.pricingTiers.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{t.name}</p>
                {t.description ? (
                  <p className="mt-0.5 text-xs text-ink-soft">{t.description}</p>
                ) : null}
                {t.availableUntil ? (
                  <p className="mt-0.5 text-2xs text-ink-faint">
                    Available until {formatDateMedium(t.availableUntil)}
                  </p>
                ) : null}
                {t.seatsLeft != null ? (
                  <p className="mt-0.5 text-2xs text-ink-faint">
                    {t.seatsLeft} seat{t.seatsLeft === 1 ? "" : "s"} left
                  </p>
                ) : null}
              </div>
              <p className="font-display text-base text-ink">
                {formatCurrency(t.price, dto.currency, "Free")}
              </p>
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
