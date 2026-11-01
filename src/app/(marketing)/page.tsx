import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";
import { getPublishedPage } from "@/src/features/website/siteContent.service";
import {
  MarketingPageBlocks,
  loadLiveMarketingData,
} from "@/src/features/website/components/MarketingPageBlocks";
import { buildPageMetadata, getSiteOrigin } from "@/src/features/website/pageMetadata";
import { shouldHideEmptySection } from "@/src/features/website/marketingData.logic";
import { listVisibleFaqs } from "@/src/features/website/marketingData.service";
import { buildFaqPageJsonLd } from "@/src/features/website/seo.logic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("home");
  return buildPageMetadata(page?.seo, {
    title: "Avoeline — Run every event from one place",
    description:
      "Registrations, tickets, hackathons, clubs, sponsors and certificates — built for the people who actually organize.",
    path: "/",
  });
}

function HomeJsonLd({
  statsLine,
  faqLd,
}: {
  statsLine?: string;
  faqLd: Record<string, unknown> | null;
}) {
  const origin = getSiteOrigin();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Avoeline",
        url: origin,
        email: "info@aroxes.com",
        parentOrganization: {
          "@type": "Organization",
          name: "Aroxes",
          url: "https://aroxes.com",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Avoeline",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: origin,
        description:
          "Event operations platform for organizers and vendors — registrations, vendors, hackathons, and certificates.",
        ...(statsLine ? { disambiguatingDescription: statsLine } : {}),
      },
      ...(faqLd ? [faqLd] : []),
    ],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

function MinimalHomeFallback() {
  return (
    <section className="ink-panel on-ink relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_80%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-[1200px]">
        <p className="mb-6 text-sm font-medium text-white/70">Avoeline</p>
        <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl">
          Run every event from one place.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
          Registrations, tickets, hackathons, clubs, sponsors and certificates, built for the people
          who actually organize.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/auth/signup"
            className={buttonClass(
              "primary",
              "lg",
              "bg-white text-gray-950 border-white hover:bg-white/90 hover:border-white",
            )}
          >
            Get started free
          </Link>
          <Link
            href="/plans"
            className="inline-flex h-11 items-center rounded-xl border border-white/25 px-5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            See plans
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [page, live, faqs] = await Promise.all([
    getPublishedPage("home"),
    loadLiveMarketingData(),
    listVisibleFaqs(),
  ]);
  const hasCms = Boolean(page);
  const statsLine = !shouldHideEmptySection(live.stats)
    ? live.stats.map((s) => `${s.value} ${s.label}`).join(" · ")
    : undefined;
  const faqLd = buildFaqPageJsonLd(
    getSiteOrigin(),
    faqs.map((f) => ({ question: f.question, answer: f.answer })),
  );

  return (
    <main className="flex-1">
      <HomeJsonLd statsLine={statsLine} faqLd={faqLd} />
      {hasCms ? <MarketingPageBlocks slug="home" live={live} /> : <MinimalHomeFallback />}
    </main>
  );
}
