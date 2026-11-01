import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";
import { getPublishedPage } from "@/src/features/website/siteContent.service";
import { buildPageMetadata } from "@/src/features/website/pageMetadata";
import { MarketingPageBlocks } from "@/src/features/website/components/MarketingPageBlocks";
import {
  listGrantedPartners,
  type MarketingPartner,
} from "@/src/features/website/marketingData.service";
import { shouldHideEmptySection } from "@/src/features/website/marketingData.logic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("partners");
  return buildPageMetadata(page?.seo, {
    title: "Partners — Avoeline",
    description: "Organizations on Avoeline with granted consent to appear publicly.",
    path: "/partners",
  });
}

const SECTIONS: { category: string; title: string }[] = [
  { category: "organizers", title: "Organizers and institutions on Avoeline" },
  { category: "sponsors", title: "Sponsors and partners" },
  { category: "vendors", title: "Vendors" },
  { category: "technology", title: "Technology" },
];

function PartnerSection({ title, partners }: { title: string; partners: MarketingPartner[] }) {
  if (shouldHideEmptySection(partners)) return null;
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="font-display text-2xl tracking-tight text-[var(--mkt-ink)] sm:text-3xl">
          {title}
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => {
            const card = (
              <>
                {p.logoUrl ? (
                  <Image
                    src={p.logoUrl}
                    alt={p.logoAlt || p.name}
                    width={160}
                    height={48}
                    className="h-10 w-auto object-contain opacity-90"
                  />
                ) : (
                  <p className="font-display text-lg text-[var(--mkt-ink)]">{p.name}</p>
                )}
                {p.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--mkt-muted)]">
                    {p.description}
                  </p>
                ) : null}
              </>
            );
            return (
              <li key={p.id} className="rounded-2xl border border-[var(--mkt-line)] p-6">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                    {card}
                  </a>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default async function PartnersPage() {
  const [page, allPartners] = await Promise.all([
    getPublishedPage("partners"),
    listGrantedPartners(),
  ]);

  const byCategory = new Map<string, MarketingPartner[]>();
  const uncategorized: MarketingPartner[] = [];
  for (const p of allPartners) {
    const cat = (p.category ?? "").trim().toLowerCase();
    if (!cat) {
      uncategorized.push(p);
      continue;
    }
    const list = byCategory.get(cat) ?? [];
    list.push(p);
    byCategory.set(cat, list);
  }

  const anyPartners = !shouldHideEmptySection(allPartners);

  return (
    <main className="flex-1">
      <section className="ink-panel on-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="font-display text-4xl tracking-tight text-white sm:text-5xl">Partners</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
            Only organizations that granted consent appear here.
          </p>
        </div>
      </section>

      {page ? <MarketingPageBlocks slug="partners" /> : null}

      {SECTIONS.map((s) => (
        <PartnerSection
          key={s.category}
          title={s.title}
          partners={byCategory.get(s.category) ?? []}
        />
      ))}

      <PartnerSection title="Community partners" partners={uncategorized} />

      {!anyPartners ? (
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-sm text-[var(--mkt-muted)]">
              Partner logos will appear once consent is granted.
            </p>
          </div>
        </section>
      ) : null}

      <section className="border-t border-[var(--mkt-line)] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-[var(--mkt-ink)]">Become a partner</h2>
            <p className="mt-2 text-sm text-[var(--mkt-muted)]">Tell us about your organization.</p>
          </div>
          <Link href="/contact?topic=partner" className={buttonClass("primary", "md")}>
            Contact us
          </Link>
        </div>
      </section>
    </main>
  );
}
