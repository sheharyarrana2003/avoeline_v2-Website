/** Tabs for `/admin/website?tab=` (docs/19 §4). */

export const WEBSITE_TABS = [
  {
    id: "pages",
    label: "Pages",
    w3Hint: "",
  },
  {
    id: "plans",
    label: "Plans display",
    w3Hint: "",
  },
  {
    id: "partners",
    label: "Partners",
    w3Hint: "",
  },
  {
    id: "stats",
    label: "Stats",
    w3Hint: "",
  },
  {
    id: "legal",
    label: "Legal",
    w3Hint: "",
  },
  {
    id: "faq",
    label: "FAQ",
    w3Hint: "",
  },
  {
    id: "contact",
    label: "Contact",
    w3Hint: "",
  },
  {
    id: "nav",
    label: "Navigation",
    w3Hint: "",
  },
  {
    id: "seo",
    label: "SEO",
    w3Hint: "",
  },
  {
    id: "media",
    label: "Media",
    w3Hint: "",
  },
  {
    id: "community",
    label: "Community",
    w3Hint: "",
  },
  {
    id: "insights",
    label: "Insights",
    w3Hint: "",
  },
] as const;

export type WebsiteTab = (typeof WEBSITE_TABS)[number]["id"];

export function isWebsiteTab(value: unknown): value is WebsiteTab {
  return typeof value === "string" && WEBSITE_TABS.some((t) => t.id === value);
}
