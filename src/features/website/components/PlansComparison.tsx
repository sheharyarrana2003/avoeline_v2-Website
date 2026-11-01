import { Fragment } from "react";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";
import {
  formatPlanPrice,
  type ModuleComparison,
  type MarketingFaq,
  type PublicPlan,
} from "../marketingData.service";
import { shouldHideEmptySection } from "../marketingData.logic";

function groupModules(modules: ModuleComparison["modules"]) {
  const map = new Map<string, ModuleComparison["modules"]>();
  for (const m of modules) {
    const key = m.category || "Other";
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return [...map.entries()];
}

export function PlansPageContent({
  plans,
  comparison,
  faqs,
}: {
  plans: PublicPlan[];
  comparison: ModuleComparison;
  faqs: MarketingFaq[];
}) {
  const hidePlans = shouldHideEmptySection(plans);

  return (
    <main className="flex-1">
      <section className="ink-panel on-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="font-display text-4xl tracking-tight text-white sm:text-5xl">Plans</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
            Choose a plan that matches how you run events. Prices and modules come straight from the
            live catalog.
          </p>
        </div>
      </section>

      {hidePlans ? null : (
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  plan.is_recommended
                    ? "border-[var(--mkt-accent)] bg-[var(--mkt-accent-tint)]"
                    : "border-[var(--mkt-line)] bg-paper"
                }`}
              >
                {plan.is_recommended || plan.badge_text ? (
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--mkt-accent)]">
                    {plan.badge_text?.trim() || "Recommended"}
                  </p>
                ) : null}
                <h2 className="font-display text-2xl text-[var(--mkt-ink)]">{plan.name}</h2>
                {plan.tagline ? (
                  <p className="mt-2 text-sm text-[var(--mkt-muted)]">{plan.tagline}</p>
                ) : null}
                <p className="mt-4 font-display text-3xl text-[var(--mkt-ink)]">
                  {formatPlanPrice(plan)}
                </p>
                {plan.billing_note ? (
                  <p className="mt-2 text-xs text-[var(--mkt-muted)]">{plan.billing_note}</p>
                ) : null}
                {(plan.highlight_features ?? []).length > 0 ? (
                  <ul className="mt-5 flex-1 space-y-1.5 text-sm text-[var(--mkt-muted)]">
                    {plan.highlight_features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex-1" />
                )}
                <Link
                  href={
                    plan.cta_href?.trim() || `/auth/signup?plan=${encodeURIComponent(plan.key)}`
                  }
                  className={`${buttonClass("primary", "md")} mt-6 w-full justify-center`}
                >
                  {plan.cta_label?.trim() || "Get started"}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {!shouldHideEmptySection(comparison.modules) && !shouldHideEmptySection(comparison.plans) ? (
        <section className="border-t border-[var(--mkt-line)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="font-display text-3xl tracking-tight text-[var(--mkt-ink)]">
              Compare modules
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--mkt-muted)]">
              Every module listed in the catalog, with a check when it is included on a public plan.
            </p>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--mkt-line)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--mkt-accent-tint)]/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-[var(--mkt-ink)]">Module</th>
                    {comparison.plans.map((p) => (
                      <th key={p.key} className="px-4 py-3 font-medium text-[var(--mkt-ink)]">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupModules(comparison.modules).map(([category, mods]) => (
                    <Fragment key={`cat-${category}`}>
                      <tr className="border-t border-[var(--mkt-line)] bg-paper">
                        <td
                          colSpan={comparison.plans.length + 1}
                          className="px-4 py-2 text-2xs font-medium uppercase tracking-wide text-[var(--mkt-muted)]"
                        >
                          {category}
                        </td>
                      </tr>
                      {mods.map((mod) => (
                        <tr key={mod.key} className="border-t border-[var(--mkt-line)]">
                          <td className="px-4 py-3 align-top">
                            <p className="font-medium text-[var(--mkt-ink)]">{mod.label}</p>
                            {mod.description ? (
                              <p className="mt-0.5 text-xs text-[var(--mkt-muted)]">
                                {mod.description}
                              </p>
                            ) : null}
                          </td>
                          {comparison.plans.map((p) => (
                            <td
                              key={p.key}
                              className="px-4 py-3 text-center text-[var(--mkt-muted)]"
                            >
                              {mod.includedByPlanKey[p.key] ? (
                                <span className="text-[var(--mkt-ink)]" aria-label="Included">
                                  ✓
                                </span>
                              ) : (
                                <span aria-label="Not included">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {comparison.emailCaps.hasCaps ? (
                    <Fragment key="email-caps">
                      <tr className="border-t border-[var(--mkt-line)] bg-paper">
                        <td
                          colSpan={comparison.plans.length + 1}
                          className="px-4 py-2 text-2xs font-medium uppercase tracking-wide text-[var(--mkt-muted)]"
                        >
                          Email limits
                        </td>
                      </tr>
                      <tr className="border-t border-[var(--mkt-line)]">
                        <td className="px-4 py-3 font-medium text-[var(--mkt-ink)]">
                          Daily email cap
                        </td>
                        {comparison.plans.map((p) => (
                          <td key={p.key} className="px-4 py-3 text-center text-[var(--mkt-muted)]">
                            {comparison.emailCaps.dailyByPlanKey[p.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t border-[var(--mkt-line)]">
                        <td className="px-4 py-3 font-medium text-[var(--mkt-ink)]">
                          Monthly email cap
                        </td>
                        {comparison.plans.map((p) => (
                          <td key={p.key} className="px-4 py-3 text-center text-[var(--mkt-muted)]">
                            {comparison.emailCaps.monthlyByPlanKey[p.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-[var(--mkt-line)] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--mkt-line)] bg-paper px-6 py-8 sm:flex-row sm:items-center sm:px-10">
          <div>
            <h2 className="font-display text-2xl text-[var(--mkt-ink)]">Enterprise or custom</h2>
            <p className="mt-2 max-w-lg text-sm text-[var(--mkt-muted)]">
              Need department tenancy, custom modules, or volume pricing? Tell us what you run.
            </p>
          </div>
          <Link href="/contact?topic=enterprise" className={buttonClass("primary", "md")}>
            Contact us
          </Link>
        </div>
      </section>

      {!shouldHideEmptySection(faqs) ? (
        <section className="border-t border-[var(--mkt-line)] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="mb-6 font-display text-3xl tracking-tight text-[var(--mkt-ink)]">
              Pricing FAQ
            </h2>
            <div className="divide-y divide-[var(--mkt-line)] rounded-2xl border border-[var(--mkt-line)]">
              {faqs.map((item) => (
                <details key={item.id} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-medium text-[var(--mkt-ink)] marker:content-none">
                    {item.question}
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--mkt-muted)]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
