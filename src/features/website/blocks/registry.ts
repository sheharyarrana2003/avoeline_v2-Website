import type { ComponentType } from "react";
import type { z } from "zod";
import { BLOCK_SCHEMAS, type AnyBlockData, type BlockDataMap, type BlockType } from "./schemas";
import { HeroRenderer } from "./renderers/Hero";
import { StatsStripRenderer } from "./renderers/StatsStrip";
import { LogoWallRenderer } from "./renderers/LogoWall";
import { FeatureGridRenderer } from "./renderers/FeatureGrid";
import { StepsRenderer } from "./renderers/Steps";
import { AudienceTabsRenderer } from "./renderers/AudienceTabs";
import { EventShowcaseRenderer } from "./renderers/EventShowcase";
import { PricingTeaserRenderer } from "./renderers/PricingTeaser";
import { TestimonialsRenderer } from "./renderers/Testimonials";
import { FaqRenderer } from "./renderers/Faq";
import { CtaRenderer } from "./renderers/Cta";
import { RichTextRenderer } from "./renderers/RichText";
import { TeamRenderer } from "./renderers/Team";
import { TimelineRenderer } from "./renderers/Timeline";
import { ContactInfoRenderer } from "./renderers/ContactInfo";

type BlockRendererProps<T extends BlockType> = { data: BlockDataMap[T] };

export type BlockRegistryEntry<T extends BlockType = BlockType> = {
  schema: (typeof BLOCK_SCHEMAS)[T];
  label: string;
  Renderer: ComponentType<BlockRendererProps<T>>;
};

export const BLOCK_REGISTRY: { [K in BlockType]: BlockRegistryEntry<K> } = {
  hero: { schema: BLOCK_SCHEMAS.hero, label: "Hero", Renderer: HeroRenderer },
  stats_strip: {
    schema: BLOCK_SCHEMAS.stats_strip,
    label: "Stats strip",
    Renderer: StatsStripRenderer,
  },
  logo_wall: {
    schema: BLOCK_SCHEMAS.logo_wall,
    label: "Logo wall",
    Renderer: LogoWallRenderer,
  },
  feature_grid: {
    schema: BLOCK_SCHEMAS.feature_grid,
    label: "Feature grid",
    Renderer: FeatureGridRenderer,
  },
  steps: { schema: BLOCK_SCHEMAS.steps, label: "Steps", Renderer: StepsRenderer },
  audience_tabs: {
    schema: BLOCK_SCHEMAS.audience_tabs,
    label: "Audience tabs",
    Renderer: AudienceTabsRenderer,
  },
  event_showcase: {
    schema: BLOCK_SCHEMAS.event_showcase,
    label: "Event showcase",
    Renderer: EventShowcaseRenderer,
  },
  pricing_teaser: {
    schema: BLOCK_SCHEMAS.pricing_teaser,
    label: "Pricing teaser",
    Renderer: PricingTeaserRenderer,
  },
  testimonials: {
    schema: BLOCK_SCHEMAS.testimonials,
    label: "Testimonials",
    Renderer: TestimonialsRenderer,
  },
  faq: { schema: BLOCK_SCHEMAS.faq, label: "FAQ", Renderer: FaqRenderer },
  cta: { schema: BLOCK_SCHEMAS.cta, label: "CTA", Renderer: CtaRenderer },
  rich_text: {
    schema: BLOCK_SCHEMAS.rich_text,
    label: "Rich text",
    Renderer: RichTextRenderer,
  },
  team: { schema: BLOCK_SCHEMAS.team, label: "Team", Renderer: TeamRenderer },
  timeline: {
    schema: BLOCK_SCHEMAS.timeline,
    label: "Timeline",
    Renderer: TimelineRenderer,
  },
  contact_info: {
    schema: BLOCK_SCHEMAS.contact_info,
    label: "Contact info",
    Renderer: ContactInfoRenderer,
  },
};

export function getBlockEntry(type: string): BlockRegistryEntry | null {
  if (!(type in BLOCK_REGISTRY)) return null;
  return BLOCK_REGISTRY[type as BlockType] as BlockRegistryEntry;
}

export type { AnyBlockData, BlockType };
export type BlockSchema = z.ZodType<AnyBlockData>;
