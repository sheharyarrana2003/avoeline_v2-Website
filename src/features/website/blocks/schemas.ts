import { z } from "zod";

const optionalString = z.string().trim().optional().default("");
const optionalUrl = z.string().trim().optional().default("");

export const ctaLinkSchema = z
  .object({
    label: optionalString,
    href: optionalUrl,
  })
  .strict();

export const heroBlockSchema = z
  .object({
    headline: optionalString,
    subheadline: optionalString,
    trustLine: optionalString,
    imageUrl: optionalUrl,
    imageAlt: optionalString,
    primaryCta: ctaLinkSchema.optional(),
    secondaryCta: ctaLinkSchema.optional(),
  })
  .strict();

export const statsStripItemSchema = z
  .object({
    key: optionalString,
    label: optionalString,
    value: optionalString,
  })
  .strict();

export const statsStripBlockSchema = z
  .object({
    title: optionalString,
    items: z.array(statsStripItemSchema).optional().default([]),
  })
  .strict();

export const logoWallItemSchema = z
  .object({
    name: optionalString,
    logoUrl: optionalUrl,
    href: optionalUrl,
    alt: optionalString,
  })
  .strict();

export const logoWallBlockSchema = z
  .object({
    title: optionalString,
    items: z.array(logoWallItemSchema).optional().default([]),
  })
  .strict();

export const featureGridItemSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    icon: optionalString,
    imageUrl: optionalUrl,
  })
  .strict();

export const featureGridBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    items: z.array(featureGridItemSchema).optional().default([]),
  })
  .strict();

export const stepsItemSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    icon: optionalString,
  })
  .strict();

export const stepsBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    items: z.array(stepsItemSchema).optional().default([]),
  })
  .strict();

export const audienceTabSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    icon: optionalString,
  })
  .strict();

export const audienceTabsBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    tabs: z.array(audienceTabSchema).optional().default([]),
  })
  .strict();

export const eventShowcaseItemSchema = z
  .object({
    eventId: optionalString,
    title: optionalString,
    href: optionalUrl,
    imageUrl: optionalUrl,
    imageAlt: optionalString,
    meta: optionalString,
  })
  .strict();

export const eventShowcaseBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    items: z.array(eventShowcaseItemSchema).optional().default([]),
  })
  .strict();

export const pricingTeaserItemSchema = z
  .object({
    name: optionalString,
    tagline: optionalString,
    price: optionalString,
    href: optionalUrl,
    recommended: z.boolean().optional().default(false),
    features: z.array(z.string()).optional().default([]),
  })
  .strict();

export const pricingTeaserBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    ctaLabel: optionalString,
    ctaHref: optionalUrl,
    showRecommended: z.boolean().optional().default(false),
    items: z.array(pricingTeaserItemSchema).optional().default([]),
  })
  .strict();

export const testimonialItemSchema = z
  .object({
    quote: optionalString,
    name: optionalString,
    role: optionalString,
    organization: optionalString,
    avatarUrl: optionalUrl,
  })
  .strict();

export const testimonialsBlockSchema = z
  .object({
    title: optionalString,
    items: z.array(testimonialItemSchema).optional().default([]),
  })
  .strict();

export const faqItemSchema = z
  .object({
    question: optionalString,
    answer: optionalString,
  })
  .strict();

export const faqBlockSchema = z
  .object({
    title: optionalString,
    items: z.array(faqItemSchema).optional().default([]),
  })
  .strict();

export const ctaBlockSchema = z
  .object({
    headline: optionalString,
    body: optionalString,
    primaryCta: ctaLinkSchema.optional(),
    secondaryCta: ctaLinkSchema.optional(),
  })
  .strict();

export const richTextBlockSchema = z
  .object({
    title: optionalString,
    markdown: optionalString,
  })
  .strict();

export const teamMemberSchema = z
  .object({
    name: optionalString,
    role: optionalString,
    bio: optionalString,
    photoUrl: optionalUrl,
  })
  .strict();

export const teamBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    members: z.array(teamMemberSchema).optional().default([]),
  })
  .strict();

export const timelineItemSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    date: optionalString,
  })
  .strict();

export const timelineBlockSchema = z
  .object({
    title: optionalString,
    body: optionalString,
    items: z.array(timelineItemSchema).optional().default([]),
  })
  .strict();

export const contactInfoBlockSchema = z
  .object({
    title: optionalString,
    email: optionalString,
    phone: optionalString,
    whatsapp: optionalString,
    address: optionalString,
    responseTime: optionalString,
  })
  .strict();

export const BLOCK_SCHEMAS = {
  hero: heroBlockSchema,
  stats_strip: statsStripBlockSchema,
  logo_wall: logoWallBlockSchema,
  feature_grid: featureGridBlockSchema,
  steps: stepsBlockSchema,
  audience_tabs: audienceTabsBlockSchema,
  event_showcase: eventShowcaseBlockSchema,
  pricing_teaser: pricingTeaserBlockSchema,
  testimonials: testimonialsBlockSchema,
  faq: faqBlockSchema,
  cta: ctaBlockSchema,
  rich_text: richTextBlockSchema,
  team: teamBlockSchema,
  timeline: timelineBlockSchema,
  contact_info: contactInfoBlockSchema,
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;

export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];

export type BlockDataMap = {
  [K in BlockType]: z.infer<(typeof BLOCK_SCHEMAS)[K]>;
};

export type AnyBlockData = BlockDataMap[BlockType];

export function isBlockType(value: string): value is BlockType {
  return value in BLOCK_SCHEMAS;
}

export type ParseBlockDraftResult =
  | { [K in BlockType]: { ok: true; type: K; data: BlockDataMap[K] } }[BlockType]
  | { ok: false; error: z.ZodError };

/**
 * Parse a draft/published jsonb payload for a known block type.
 * Unknown fields are rejected (`.strict()`).
 */
export function parseBlockDraft(type: string, data: unknown): ParseBlockDraftResult {
  if (!isBlockType(type)) {
    return {
      ok: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["type"],
          message: `Unknown block type: ${type}`,
        },
      ]),
    };
  }
  const parsed = BLOCK_SCHEMAS[type].safeParse(data ?? {});
  if (!parsed.success) return { ok: false, error: parsed.error };
  return { ok: true, type, data: parsed.data } as ParseBlockDraftResult;
}
