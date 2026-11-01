import { redirect } from "next/navigation";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { canWebsiteCap } from "@/src/features/admin/types";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { isWebsiteTab, WEBSITE_TABS, type WebsiteTab } from "@/src/features/website/adminTabs";
import {
  listAdminBlocks,
  listAdminPages,
  listPageRevisions,
  getPublicStats,
} from "@/src/features/website/siteContent.service";
import {
  listPlansForDisplay,
  listSiteSettings,
  listStatsSettings,
} from "@/src/features/website/settingsCms.service";
import { listPartnersAdmin } from "@/src/features/website/partnersCms.service";
import { listLegalDocuments, listLegalVersions } from "@/src/features/website/legalCms.service";
import {
  listContactMessages,
  listFaqsAdmin,
  listTestimonialsAdmin,
} from "@/src/features/website/contentCms.service";
import { listSiteMedia, siteMediaPublicUrl } from "@/src/features/website/mediaCms.service";
import { formatStatValue } from "@/src/features/website/marketingData.logic";
import { PagesCmsClient } from "@/src/features/website/components/admin/PagesCmsClient";
import { PlansDisplayPanel } from "@/src/features/website/components/admin/PlansDisplayPanel";
import { StatsCmsPanel } from "@/src/features/website/components/admin/StatsCmsPanel";
import { JsonSettingsPanel } from "@/src/features/website/components/admin/JsonSettingsPanel";
import { PartnersCmsPanel } from "@/src/features/website/components/admin/PartnersCmsPanel";
import { LegalCmsPanel } from "@/src/features/website/components/admin/LegalCmsPanel";
import { FaqTestimonialsPanel } from "@/src/features/website/components/admin/FaqTestimonialsPanel";
import { ContactInboxPanel } from "@/src/features/website/components/admin/ContactInboxPanel";
import { MediaLibraryPanel } from "@/src/features/website/components/admin/MediaLibraryPanel";
import { SeoCmsPanel } from "@/src/features/website/components/admin/SeoCmsPanel";
import { CommunityCmsPanel } from "@/src/features/website/components/admin/CommunityCmsPanel";
import { InsightsCmsPanel } from "@/src/features/website/components/admin/InsightsCmsPanel";
import {
  getMarketingInsights,
  listMarketingConsents,
} from "@/src/features/website/consent.service";

export const dynamic = "force-dynamic";

async function PagesTab({ pageId }: { pageId?: string }) {
  const pages = await listAdminPages();
  const selectedId = pageId && pages.some((p) => p.id === pageId) ? pageId : pages[0]?.id;
  if (!selectedId) {
    return <EmptyState title="No pages" description="Seed marketing pages first." size="sm" />;
  }
  const [blocks, revisions] = await Promise.all([
    listAdminBlocks(selectedId),
    listPageRevisions(selectedId),
  ]);
  return (
    <PagesCmsClient
      pages={pages}
      initialPageId={selectedId}
      blocks={blocks.map((b) => ({
        id: b.id,
        page_id: b.page_id,
        type: b.type,
        sort: b.sort,
        visible: b.visible,
        draft: (b.draft as Record<string, unknown>) ?? {},
        published: (b.published as Record<string, unknown> | null) ?? null,
      }))}
      revisions={revisions.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        created_by: r.created_by,
      }))}
    />
  );
}

async function TabPanel({
  tab,
  pageId,
  adminId,
  canContact,
  canCommunity,
}: {
  tab: WebsiteTab;
  pageId?: string;
  adminId: string;
  canContact: boolean;
  canCommunity: boolean;
}) {
  const meta = WEBSITE_TABS.find((t) => t.id === tab)!;

  if (tab === "pages") return <PagesTab pageId={pageId} />;

  if (tab === "plans") {
    const plans = await listPlansForDisplay();
    return (
      <PlansDisplayPanel
        plans={plans.map((p) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          is_public: p.is_public,
          is_recommended: p.is_recommended,
          badge_text: p.badge_text,
          tagline: p.tagline,
          highlight_features: p.highlight_features ?? [],
          cta_label: p.cta_label,
          cta_href: p.cta_href,
          sort_order: p.sort_order,
          price_monthly: p.price_monthly,
        }))}
      />
    );
  }

  if (tab === "partners") {
    const partners = await listPartnersAdmin();
    return <PartnersCmsPanel partners={partners} />;
  }

  if (tab === "stats") {
    const [settings, stats, siteSettings] = await Promise.all([
      listStatsSettings(),
      getPublicStats(),
      listSiteSettings(["stats"]),
    ]);
    const refreshSeconds =
      typeof (siteSettings.stats as { refreshSeconds?: number } | null)?.refreshSeconds === "number"
        ? (siteSettings.stats as { refreshSeconds: number }).refreshSeconds
        : 300;
    return (
      <StatsCmsPanel
        refreshSeconds={refreshSeconds}
        rows={settings.map((s) => {
          const raw = Number((stats as Record<string, number> | null)?.[s.key] ?? 0);
          const meets = raw >= s.min_threshold && s.visible;
          return {
            key: s.key,
            label: s.label,
            visible: s.visible,
            min_threshold: s.min_threshold,
            format: s.format,
            rawValue: raw,
            displayedValue: meets ? formatStatValue(raw, s.format) : "(hidden)",
          };
        })}
      />
    );
  }

  if (tab === "legal") {
    const docs = await listLegalDocuments();
    const withVersions = await Promise.all(
      docs.map(async (d) => {
        const versions = await listLegalVersions(d.id);
        return {
          id: d.id,
          slug: d.slug,
          title: d.title,
          currentBody: d.current?.body_md ?? versions[0]?.body_md ?? "",
          versions,
        };
      }),
    );
    return <LegalCmsPanel documents={withVersions} />;
  }

  if (tab === "faq") {
    const [faqs, testimonials] = await Promise.all([listFaqsAdmin(), listTestimonialsAdmin()]);
    return <FaqTestimonialsPanel faqs={faqs} testimonials={testimonials} />;
  }

  if (tab === "contact") {
    if (!canContact) {
      return (
        <EmptyState
          title="Contact inbox"
          description="You need contact:manage to triage messages."
          size="sm"
        />
      );
    }
    const messages = await listContactMessages();
    return <ContactInboxPanel messages={messages} adminId={adminId} />;
  }

  if (tab === "nav") {
    const settings = await listSiteSettings(["nav", "footer", "social", "contact", "announcement"]);
    return (
      <div className="space-y-8">
        <JsonSettingsPanel title="Navigation" settingKey="nav" initialValue={settings.nav ?? []} />
        <JsonSettingsPanel
          title="Footer"
          settingKey="footer"
          initialValue={settings.footer ?? {}}
        />
        <JsonSettingsPanel
          title="Social links"
          settingKey="social"
          initialValue={settings.social ?? {}}
        />
        <JsonSettingsPanel
          title="Contact details"
          settingKey="contact"
          initialValue={settings.contact ?? {}}
        />
        <JsonSettingsPanel
          title="Announcement banner"
          settingKey="announcement"
          initialValue={settings.announcement ?? {}}
          hint="Include startsAt / endsAt ISO dates to schedule the banner."
        />
      </div>
    );
  }

  if (tab === "seo") {
    const [pages, settings] = await Promise.all([
      listAdminPages(),
      listSiteSettings(["seo_defaults"]),
    ]);
    return (
      <SeoCmsPanel
        seoDefaults={settings.seo_defaults ?? {}}
        pages={pages.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          seo: (p.seo as { title?: string; description?: string; ogImage?: string }) ?? {},
        }))}
      />
    );
  }

  if (tab === "media") {
    const media = await listSiteMedia();
    return (
      <MediaLibraryPanel
        items={media.map((m) => ({
          id: m.id,
          path: m.path,
          alt: m.alt,
          tags: m.tags ?? [],
          mime: m.mime,
          width: m.width,
          height: m.height,
          url: siteMediaPublicUrl(m.path),
        }))}
      />
    );
  }

  if (tab === "community") {
    if (!canCommunity) {
      return (
        <EmptyState
          title="Community"
          description="You need community:view to list opted-in contacts."
          size="sm"
        />
      );
    }
    const consents = await listMarketingConsents({ includeWithdrawn: true });
    return (
      <CommunityCmsPanel
        rows={consents.map((r) => ({
          id: r.id,
          email: r.email,
          scope: r.scope,
          source: r.source,
          granted_at: r.granted_at,
          withdrawn_at: r.withdrawn_at,
        }))}
      />
    );
  }

  if (tab === "insights") {
    const insights = await getMarketingInsights();
    return <InsightsCmsPanel data={insights} />;
  }

  return <EmptyState title={meta.label} description={meta.w3Hint} size="sm" />;
}

export default async function AdminWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const gate = await requireWebsiteCap("website:view");
  if ("ok" in gate && gate.ok === false) {
    redirect(
      gate.error.code === "UNAUTHORIZED"
        ? "/admin/signin?next=/admin/website"
        : "/access-denied?required=website:view",
    );
  }
  // After failure redirect, remaining SafeActionResult branch is the impossible ok:true.
  if ("ok" in gate) {
    redirect("/access-denied?required=website:view");
  }

  const { tab: raw, page: pageId } = await searchParams;
  const tab: WebsiteTab = isWebsiteTab(raw) ? raw : "pages";

  const tabs = WEBSITE_TABS.map((t) => ({
    label: t.label,
    value: t.id,
    href: `/admin/website?tab=${t.id}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website"
        description="Marketing CMS for public pages, legal, contact, and site chrome. Draft first, then publish."
      />
      <FilterTabs tabs={tabs} activeValue={tab} label="Website CMS sections" />
      <TabPanel
        tab={tab}
        pageId={pageId}
        adminId={gate.userId}
        canContact={canWebsiteCap(gate, "contact:manage")}
        canCommunity={canWebsiteCap(gate, "community:view")}
      />
    </div>
  );
}
