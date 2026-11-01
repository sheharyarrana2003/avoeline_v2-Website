import "server-only";

import { getPublishedBlocks, getPublishedPage } from "../siteContent.service";
import { BlockRenderer } from "./BlockRenderer";
import {
  formatPlanPrice,
  getStatsStrip,
  listGrantedPartners,
  listMarketingEvents,
  listPublicPlans,
  listVisibleTestimonials,
  type MarketingEvent,
  type MarketingPartner,
  type MarketingTestimonial,
  type PublicPlan,
} from "../marketingData.service";
import type { FilteredStatItem } from "../marketingData.logic";
import { shouldHideEmptySection } from "../marketingData.logic";
import type { BlockDataMap } from "../blocks/schemas";
import { parseBlockDraft } from "../blocks/schemas";

export type LiveMarketingData = {
  stats: FilteredStatItem[];
  partners: MarketingPartner[];
  events: MarketingEvent[];
  plans: PublicPlan[];
  testimonials: MarketingTestimonial[];
};

export async function loadLiveMarketingData(): Promise<LiveMarketingData> {
  const [stats, partners, events, plans, testimonials] = await Promise.all([
    getStatsStrip(),
    listGrantedPartners(),
    listMarketingEvents(6),
    listPublicPlans(),
    listVisibleTestimonials(),
  ]);
  return { stats, partners, events, plans, testimonials };
}

function statsToBlock(
  cms: BlockDataMap["stats_strip"],
  live: FilteredStatItem[],
): BlockDataMap["stats_strip"] | null {
  if (shouldHideEmptySection(live)) return null;
  return {
    title: cms.title,
    items: live.map((s) => ({ key: s.key, label: s.label, value: s.value })),
  };
}

function partnersToBlock(
  cms: BlockDataMap["logo_wall"],
  live: MarketingPartner[],
): BlockDataMap["logo_wall"] | null {
  if (shouldHideEmptySection(live)) return null;
  return {
    title: cms.title,
    items: live.map((p) => ({
      name: p.name,
      logoUrl: p.logoUrl,
      href: p.url,
      alt: p.logoAlt || p.name,
    })),
  };
}

function eventsToBlock(
  cms: BlockDataMap["event_showcase"],
  live: MarketingEvent[],
): BlockDataMap["event_showcase"] | null {
  if (shouldHideEmptySection(live)) return null;
  return {
    title: cms.title,
    body: cms.body,
    items: live.map((e) => ({
      eventId: e.id,
      title: e.title,
      href: e.href,
      imageUrl: e.imageUrl,
      imageAlt: e.imageAlt,
      meta: e.meta,
    })),
  };
}

function plansToBlock(
  cms: BlockDataMap["pricing_teaser"],
  live: PublicPlan[],
): BlockDataMap["pricing_teaser"] | null {
  if (shouldHideEmptySection(live)) return null;
  return {
    title: cms.title,
    body: cms.body,
    ctaLabel: cms.ctaLabel || "See all plans",
    ctaHref: cms.ctaHref || "/plans",
    showRecommended: cms.showRecommended,
    items: live.map((p) => ({
      name: p.name,
      tagline: p.tagline ?? "",
      price: formatPlanPrice(p),
      href: p.cta_href || `/auth/signup?plan=${encodeURIComponent(p.key)}`,
      recommended: Boolean(p.is_recommended),
      features: p.highlight_features ?? [],
    })),
  };
}

function testimonialsToBlock(
  cms: BlockDataMap["testimonials"],
  live: MarketingTestimonial[],
): BlockDataMap["testimonials"] | null {
  if (shouldHideEmptySection(live)) return null;
  return {
    title: cms.title,
    items: live.map((t) => ({
      quote: t.quote,
      name: t.name,
      role: t.role,
      organization: t.organization,
      avatarUrl: t.avatarUrl,
    })),
  };
}

/**
 * Renders published CMS blocks for a page slug, wiring live DB sections:
 * stats / partners / events / plans / testimonials. Empty live sections hide.
 */
export async function MarketingPageBlocks({
  slug,
  live: liveProp,
}: {
  slug: string;
  live?: LiveMarketingData;
}) {
  const page = await getPublishedPage(slug);
  if (!page) return null;

  const [blocks, live] = await Promise.all([
    getPublishedBlocks(page.id),
    liveProp ? Promise.resolve(liveProp) : loadLiveMarketingData(),
  ]);

  if (!blocks.length) return null;

  return (
    <>
      {blocks.map((block) => {
        const parsed = parseBlockDraft(block.type, block.published);
        if (!parsed.ok) return null;

        let data: unknown = parsed.data;

        switch (parsed.type) {
          case "stats_strip": {
            const next = statsToBlock(parsed.data, live.stats);
            if (!next) return null;
            data = next;
            break;
          }
          case "logo_wall": {
            const next = partnersToBlock(parsed.data, live.partners);
            if (!next) return null;
            data = next;
            break;
          }
          case "event_showcase": {
            const next = eventsToBlock(parsed.data, live.events);
            if (!next) return null;
            data = next;
            break;
          }
          case "pricing_teaser": {
            const next = plansToBlock(parsed.data, live.plans);
            if (!next) return null;
            data = next;
            break;
          }
          case "testimonials": {
            const next = testimonialsToBlock(parsed.data, live.testimonials);
            if (!next) return null;
            data = next;
            break;
          }
          default:
            break;
        }

        return (
          <BlockRenderer key={block.id} type={block.type} data={data} visible={block.visible} />
        );
      })}
    </>
  );
}
