export const MARKETING_SITEMAP_PATHS = [
  "/",
  "/plans",
  "/about",
  "/partners",
  "/contact",
  "/privacy",
  "/terms",
  "/organizer-agreement",
  "/content-rights",
] as const;

export const MARKETING_ROBOTS_DISALLOW = ["/admin", "/organizer", "/vendor", "/attendee"] as const;

export type FaqJsonLdItem = {
  question: string;
  answer: string;
};

/** Build FAQPage JSON-LD only when real Q&A rows exist. */
export function buildFaqPageJsonLd(
  origin: string,
  faqs: FaqJsonLdItem[],
): Record<string, unknown> | null {
  const items = faqs
    .map((f) => ({
      question: String(f.question ?? "").trim(),
      answer: String(f.answer ?? "").trim(),
    }))
    .filter((f) => f.question && f.answer);
  if (!items.length) return null;

  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
    url: origin,
  };
}
