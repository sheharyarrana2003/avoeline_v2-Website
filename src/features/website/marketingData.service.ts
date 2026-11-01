import "server-only";

import { unstable_cache } from "next/cache";
import { TABLES } from "@/data/collections";
import { MEDIA_BUCKET, supabaseAdmin } from "@/data/supabase";
import type { Database } from "@/src/lib/database.types";
import { SITE_ALL, SITE_EVENTS, SITE_PLANS, SITE_STATS } from "./cacheTags";
import {
  filterStatsByThreshold,
  sortPublicPlans,
  type FilteredStatItem,
} from "./marketingData.logic";
import { getPublicStats } from "./siteContent.service";

type PlanRow = Database["public"]["Tables"]["subscription_plans"]["Row"];
type PartnerRow = Database["public"]["Tables"]["site_partners"]["Row"];
type TestimonialRow = Database["public"]["Tables"]["site_testimonials"]["Row"];
type ModuleRow = Database["public"]["Tables"]["module_catalog"]["Row"];
type FaqRow = Database["public"]["Tables"]["site_faqs"]["Row"];
type MediaRow = Database["public"]["Tables"]["site_media"]["Row"];

function isMissingColumnError(message: string | undefined, column: string): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes(column.toLowerCase()) && (m.includes("column") || m.includes("schema cache"));
}

function publicStorageUrl(path: string | null | undefined): string {
  const p = String(path ?? "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const { data } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(p);
  return data.publicUrl;
}

async function mediaUrlByIds(ids: string[]): Promise<Map<string, { url: string; alt: string }>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, { url: string; alt: string }>();
  if (!unique.length) return map;
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_MEDIA)
    .select("id, path, alt")
    .in("id", unique);
  if (error) {
    console.error("[site_media]", error.message);
    return map;
  }
  for (const row of (data as Pick<MediaRow, "id" | "path" | "alt">[] | null) ?? []) {
    map.set(row.id, { url: publicStorageUrl(row.path), alt: row.alt ?? "" });
  }
  return map;
}

function formatPlanPrice(plan: PlanRow): string {
  const amount = plan.price_monthly;
  const currency = (plan.currency || "PKR").toUpperCase();
  if (amount == null) return "";
  if (Number(amount) === 0) return "Free";
  try {
    return `${new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount))}/mo`;
  } catch {
    return `${currency} ${amount}/mo`;
  }
}

// ── Stats strip ──────────────────────────────────────────────────────────────

async function fetchStatsStrip(): Promise<FilteredStatItem[]> {
  try {
    const [stats, settingsRes] = await Promise.all([
      getPublicStats(),
      supabaseAdmin
        .from(TABLES.SITE_STATS_SETTINGS)
        .select("key, label, visible, min_threshold, format"),
    ]);
    if (settingsRes.error) {
      console.error("[getStatsStrip] settings", settingsRes.error.message);
      return [];
    }
    return filterStatsByThreshold(stats, settingsRes.data ?? []);
  } catch (err) {
    console.error("[getStatsStrip]", err);
    return [];
  }
}

export function getStatsStrip(): Promise<FilteredStatItem[]> {
  return unstable_cache(() => fetchStatsStrip(), ["site-stats-strip"], {
    tags: [SITE_STATS, SITE_ALL],
    revalidate: 3600,
  })();
}

// ── Public plans ─────────────────────────────────────────────────────────────

export type PublicPlan = PlanRow;

async function fetchPublicPlans(): Promise<PublicPlan[]> {
  const selectCols =
    "id, key, name, description, tagline, badge_text, billing_note, cta_label, cta_href, currency, price_monthly, price_yearly, highlight_features, included_modules, is_active, is_public, is_recommended, sort_order, audience, updated_at, created_at, email_daily_cap, email_monthly_cap";

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTION_PLANS)
      .select(selectCols)
      .eq("is_public", true)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      // Seed migration may lag: retry without email cap columns.
      if (
        isMissingColumnError(error.message, "email_daily_cap") ||
        isMissingColumnError(error.message, "email_monthly_cap")
      ) {
        const fallback = await supabaseAdmin
          .from(TABLES.SUBSCRIPTION_PLANS)
          .select(
            "id, key, name, description, tagline, badge_text, billing_note, cta_label, cta_href, currency, price_monthly, price_yearly, highlight_features, included_modules, is_active, is_public, is_recommended, sort_order, audience, updated_at, created_at",
          )
          .eq("is_public", true)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (fallback.error) {
          console.error("[listPublicPlans]", fallback.error.message);
          return [];
        }
        return sortPublicPlans((fallback.data as PublicPlan[] | null) ?? []);
      }
      console.error("[listPublicPlans]", error.message);
      return [];
    }
    return sortPublicPlans((data as PublicPlan[] | null) ?? []);
  } catch (err) {
    console.error("[listPublicPlans]", err);
    return [];
  }
}

export function listPublicPlans(): Promise<PublicPlan[]> {
  return unstable_cache(() => fetchPublicPlans(), ["site-public-plans"], {
    tags: [SITE_PLANS, SITE_ALL],
  })();
}

// ── Module comparison ────────────────────────────────────────────────────────

export type ModuleComparisonRow = {
  key: string;
  label: string;
  description: string;
  category: string;
  sort: number;
  includedByPlanKey: Record<string, boolean>;
};

export type ModuleComparison = {
  plans: PublicPlan[];
  modules: ModuleComparisonRow[];
  emailCaps: {
    dailyByPlanKey: Record<string, number | null>;
    monthlyByPlanKey: Record<string, number | null>;
    hasCaps: boolean;
  };
};

async function fetchModuleComparison(): Promise<ModuleComparison> {
  try {
    const [plans, catalogRes] = await Promise.all([
      fetchPublicPlans(),
      supabaseAdmin
        .from(TABLES.MODULE_CATALOG)
        .select("key, label, description, category, sort")
        .order("sort", {
          ascending: true,
        }),
    ]);

    if (catalogRes.error) {
      console.error("[getModuleComparison] catalog", catalogRes.error.message);
    }

    const modules: ModuleComparisonRow[] = ((catalogRes.data as ModuleRow[] | null) ?? []).map(
      (mod) => {
        const includedByPlanKey: Record<string, boolean> = {};
        for (const plan of plans) {
          const set = new Set(plan.included_modules ?? []);
          includedByPlanKey[plan.key] = set.has(mod.key);
        }
        return {
          key: mod.key,
          label: mod.label,
          description: mod.description ?? "",
          category: mod.category,
          sort: mod.sort,
          includedByPlanKey,
        };
      },
    );

    const dailyByPlanKey: Record<string, number | null> = {};
    const monthlyByPlanKey: Record<string, number | null> = {};
    let hasCaps = false;
    for (const plan of plans) {
      const daily = plan.email_daily_cap ?? null;
      const monthly = plan.email_monthly_cap ?? null;
      dailyByPlanKey[plan.key] = daily;
      monthlyByPlanKey[plan.key] = monthly;
      if (daily != null || monthly != null) hasCaps = true;
    }

    return { plans, modules, emailCaps: { dailyByPlanKey, monthlyByPlanKey, hasCaps } };
  } catch (err) {
    console.error("[getModuleComparison]", err);
    return {
      plans: [],
      modules: [],
      emailCaps: { dailyByPlanKey: {}, monthlyByPlanKey: {}, hasCaps: false },
    };
  }
}

export function getModuleComparison(): Promise<ModuleComparison> {
  return unstable_cache(() => fetchModuleComparison(), ["site-module-comparison"], {
    tags: [SITE_PLANS, SITE_ALL],
  })();
}

// ── Marketing events ─────────────────────────────────────────────────────────

export type MarketingEvent = {
  id: string;
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  meta: string;
  startDate: string | null;
  websiteFeatured: boolean;
};

async function fetchMarketingEvents(limit: number): Promise<MarketingEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const baseSelect =
    "id, title, short_description, banner_image, start_date, start_time, city, venue_name, visibility, status, is_demo";

  try {
    let withFeatured = true;
    let data: Array<Record<string, unknown>> | null = null;

    const primary = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select(`${baseSelect}, website_featured`)
      .in("visibility", ["public", "hybrid"])
      .eq("is_demo", false)
      .is("deleted_at", null)
      .is("archived_at", null)
      .gte("start_date", today)
      .order("website_featured", { ascending: false })
      .order("start_date", { ascending: true })
      .limit(limit);

    if (primary.error && isMissingColumnError(primary.error.message, "website_featured")) {
      withFeatured = false;
      const fallback = await supabaseAdmin
        .from(TABLES.EVENTS)
        .select(baseSelect)
        .in("visibility", ["public", "hybrid"])
        .eq("is_demo", false)
        .is("deleted_at", null)
        .is("archived_at", null)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(limit);
      if (fallback.error) {
        console.error("[listMarketingEvents]", fallback.error.message);
        return [];
      }
      data = (fallback.data as Array<Record<string, unknown>> | null) ?? [];
    } else if (primary.error) {
      console.error("[listMarketingEvents]", primary.error.message);
      return [];
    } else {
      data = (primary.data as Array<Record<string, unknown>> | null) ?? [];
    }

    const mapped = (data ?? []).map((row) => {
      const startDate = row.start_date ? String(row.start_date) : null;
      const city = row.city ? String(row.city) : "";
      const venue = row.venue_name ? String(row.venue_name) : "";
      const metaParts = [
        startDate
          ? new Date(`${startDate}T00:00:00`).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "",
        city || venue,
      ].filter(Boolean);
      return {
        id: String(row.id),
        title: String(row.title ?? ""),
        href: `/events/${row.id}`,
        imageUrl: publicStorageUrl(row.banner_image as string | null),
        imageAlt: String(row.title ?? ""),
        meta: metaParts.join(" · "),
        startDate,
        websiteFeatured: withFeatured ? Boolean(row.website_featured) : false,
      } satisfies MarketingEvent;
    });

    return mapped.sort((a, b) => {
      const feat = Number(b.websiteFeatured) - Number(a.websiteFeatured);
      if (feat !== 0) return feat;
      return String(a.startDate ?? "").localeCompare(String(b.startDate ?? ""));
    });
  } catch (err) {
    console.error("[listMarketingEvents]", err);
    return [];
  }
}

export function listMarketingEvents(limit = 6): Promise<MarketingEvent[]> {
  const capped = Math.min(Math.max(1, limit), 24);
  return unstable_cache(
    () => fetchMarketingEvents(capped),
    ["site-marketing-events", String(capped)],
    {
      tags: [SITE_EVENTS, SITE_ALL],
      revalidate: 600,
    },
  )();
}

// ── Partners ─────────────────────────────────────────────────────────────────

export type MarketingPartner = {
  id: string;
  name: string;
  url: string;
  category: string | null;
  description: string | null;
  featured: boolean;
  logoUrl: string;
  logoAlt: string;
};

async function fetchGrantedPartners(category?: string): Promise<MarketingPartner[]> {
  try {
    let q = supabaseAdmin
      .from(TABLES.SITE_PARTNERS)
      .select(
        "id, name, url, category, description, featured, sort, logo_media_id, consent_status, visible",
      )
      .eq("consent_status", "granted")
      .eq("visible", true)
      .order("featured", { ascending: false })
      .order("sort", { ascending: true });

    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error) {
      console.error("[listGrantedPartners]", error.message);
      return [];
    }

    const rows = (data as PartnerRow[] | null) ?? [];
    const media = await mediaUrlByIds(rows.map((r) => r.logo_media_id).filter(Boolean) as string[]);

    return rows.map((r) => {
      const m = r.logo_media_id ? media.get(r.logo_media_id) : undefined;
      return {
        id: r.id,
        name: r.name,
        url: r.url ?? "",
        category: r.category,
        description: r.description,
        featured: r.featured,
        logoUrl: m?.url ?? "",
        logoAlt: m?.alt || r.name,
      };
    });
  } catch (err) {
    console.error("[listGrantedPartners]", err);
    return [];
  }
}

export function listGrantedPartners(category?: string): Promise<MarketingPartner[]> {
  const key = category ?? "all";
  return unstable_cache(() => fetchGrantedPartners(category), ["site-partners", key], {
    tags: [SITE_ALL],
  })();
}

// ── Testimonials ─────────────────────────────────────────────────────────────

export type MarketingTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  organization: string;
  avatarUrl: string;
};

async function fetchVisibleTestimonials(): Promise<MarketingTestimonial[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.SITE_TESTIMONIALS)
      .select(
        "id, quote, name, role, organization, avatar_media_id, consent_confirmed, visible, sort",
      )
      .eq("consent_confirmed", true)
      .eq("visible", true)
      .order("sort", { ascending: true });

    if (error) {
      console.error("[listVisibleTestimonials]", error.message);
      return [];
    }

    const rows = (data as TestimonialRow[] | null) ?? [];
    const media = await mediaUrlByIds(
      rows.map((r) => r.avatar_media_id).filter(Boolean) as string[],
    );

    return rows.map((r) => {
      const m = r.avatar_media_id ? media.get(r.avatar_media_id) : undefined;
      return {
        id: r.id,
        quote: r.quote,
        name: r.name,
        role: r.role ?? "",
        organization: r.organization ?? "",
        avatarUrl: m?.url ?? "",
      };
    });
  } catch (err) {
    console.error("[listVisibleTestimonials]", err);
    return [];
  }
}

export function listVisibleTestimonials(): Promise<MarketingTestimonial[]> {
  return unstable_cache(() => fetchVisibleTestimonials(), ["site-testimonials"], {
    tags: [SITE_ALL],
  })();
}

// ── FAQs ─────────────────────────────────────────────────────────────────────

export type MarketingFaq = {
  id: string;
  question: string;
  answer: string;
  scope: string;
};

async function fetchVisibleFaqs(scope?: string): Promise<MarketingFaq[]> {
  try {
    let q = supabaseAdmin
      .from(TABLES.SITE_FAQS)
      .select("id, question, answer_md, scope, sort, visible")
      .eq("visible", true)
      .order("sort", { ascending: true });
    if (scope) q = q.eq("scope", scope);

    const { data, error } = await q;
    if (error) {
      console.error("[listVisibleFaqs]", error.message);
      return [];
    }
    return ((data as FaqRow[] | null) ?? []).map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer_md,
      scope: r.scope,
    }));
  } catch (err) {
    console.error("[listVisibleFaqs]", err);
    return [];
  }
}

export function listVisibleFaqs(scope?: string): Promise<MarketingFaq[]> {
  const key = scope ?? "all";
  return unstable_cache(() => fetchVisibleFaqs(scope), ["site-faqs", key], {
    tags: [SITE_ALL],
  })();
}

// ── Legal ────────────────────────────────────────────────────────────────────

export type LegalDocumentView = {
  slug: string;
  title: string;
  version: number;
  bodyMd: string;
  publishedAt: string;
  effectiveDate: string | null;
  changeSummary: string | null;
};

async function fetchLegalDocument(slug: string): Promise<LegalDocumentView | null> {
  try {
    const { data: doc, error } = await supabaseAdmin
      .from(TABLES.LEGAL_DOCUMENTS)
      .select("id, slug, title, current_version_id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[getLegalDocument]", error.message);
      return null;
    }
    if (!doc?.current_version_id) return null;

    const { data: ver, error: verErr } = await supabaseAdmin
      .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
      .select("version, body_md, published_at, effective_date, change_summary")
      .eq("id", doc.current_version_id)
      .maybeSingle();

    if (verErr || !ver) {
      if (verErr) console.error("[getLegalDocument] version", verErr.message);
      return null;
    }

    return {
      slug: doc.slug,
      title: doc.title,
      version: ver.version,
      bodyMd: ver.body_md ?? "",
      publishedAt: ver.published_at,
      effectiveDate: ver.effective_date,
      changeSummary: ver.change_summary,
    };
  } catch (err) {
    console.error("[getLegalDocument]", err);
    return null;
  }
}

export function getLegalDocument(slug: string): Promise<LegalDocumentView | null> {
  return unstable_cache(() => fetchLegalDocument(slug), ["site-legal", slug], {
    tags: [SITE_ALL],
  })();
}

export { formatPlanPrice };
