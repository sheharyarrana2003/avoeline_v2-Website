import type { Metadata } from "next";
import { getPublishedPage } from "@/src/features/website/siteContent.service";
import { buildPageMetadata, getSiteOrigin } from "@/src/features/website/pageMetadata";
import {
  getModuleComparison,
  listPublicPlans,
  listVisibleFaqs,
} from "@/src/features/website/marketingData.service";
import { PlansPageContent } from "@/src/features/website/components/PlansComparison";
import { MarketingPageBlocks } from "@/src/features/website/components/MarketingPageBlocks";
import { buildFaqPageJsonLd } from "@/src/features/website/seo.logic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("plans");
  return buildPageMetadata(page?.seo, {
    title: "Plans — Avoeline",
    description: "Public Avoeline plans, module comparison, and enterprise options.",
    path: "/plans",
  });
}

export default async function PlansPage() {
  const [plans, comparison, faqs] = await Promise.all([
    listPublicPlans(),
    getModuleComparison(),
    listVisibleFaqs("plans"),
  ]);
  const faqLd = buildFaqPageJsonLd(
    `${getSiteOrigin()}/plans`,
    faqs.map((f) => ({ question: f.question, answer: f.answer })),
  );

  return (
    <>
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ "@context": "https://schema.org", ...faqLd }),
          }}
        />
      ) : null}
      <PlansPageContent plans={plans} comparison={comparison} faqs={faqs} />
      <MarketingPageBlocks slug="plans" />
    </>
  );
}
