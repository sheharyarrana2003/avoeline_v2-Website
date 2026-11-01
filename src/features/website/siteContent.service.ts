import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { Database, Json } from "@/src/lib/database.types";
import { SITE_ALL, SITE_SETTINGS, SITE_STATS, sitePage } from "./cacheTags";
import { normalizePublicStats, type PublicStats } from "./publicStats";

export type { PublicStats } from "./publicStats";
export { normalizePublicStats, PUBLIC_STATS_KEYS } from "./publicStats";

type SitePageRow = Database["public"]["Tables"]["site_pages"]["Row"];
type SiteBlockRow = Database["public"]["Tables"]["site_blocks"]["Row"];

export type PublishedBlock = Pick<
  SiteBlockRow,
  "id" | "page_id" | "type" | "sort" | "visible" | "published" | "updated_at"
>;

async function fetchPublishedPage(slug: string): Promise<SitePageRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_PAGES)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[getPublishedPage]", error.message);
    return null;
  }
  return (data as SitePageRow | null) ?? null;
}

async function fetchPublishedBlocks(pageId: string): Promise<PublishedBlock[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_BLOCKS)
    .select("id, page_id, type, sort, visible, published, updated_at")
    .eq("page_id", pageId)
    .eq("visible", true)
    .not("published", "is", null)
    .order("sort", { ascending: true });

  if (error) {
    console.error("[getPublishedBlocks]", error.message);
    return [];
  }
  return (data as PublishedBlock[] | null) ?? [];
}

async function fetchPublicStats(): Promise<PublicStats | null> {
  const { data, error } = await supabaseAdmin.rpc("get_public_stats");
  if (error) {
    console.error("[getPublicStats]", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return normalizePublicStats((row ?? null) as Record<string, unknown> | null);
}

async function fetchSiteSetting(key: string): Promise<Json | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_SETTINGS)
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("[getSiteSetting]", error.message);
    return null;
  }
  return (data?.value as Json | undefined) ?? null;
}

export function getPublishedPage(slug: string): Promise<SitePageRow | null> {
  return unstable_cache(() => fetchPublishedPage(slug), ["site-page", slug], {
    tags: [sitePage(slug), SITE_ALL],
  })();
}

export function getPublishedBlocks(pageId: string): Promise<PublishedBlock[]> {
  return unstable_cache(() => fetchPublishedBlocks(pageId), ["site-blocks", pageId], {
    tags: [SITE_ALL],
  })();
}

export function getPublicStats(): Promise<PublicStats | null> {
  return unstable_cache(() => fetchPublicStats(), ["site-public-stats"], {
    tags: [SITE_STATS, SITE_ALL],
    revalidate: 3600,
  })();
}

export function getSiteSetting(key: string): Promise<Json | null> {
  return unstable_cache(() => fetchSiteSetting(key), ["site-setting", key], {
    tags: [SITE_SETTINGS, SITE_ALL],
  })();
}

export type PublishPageInput = {
  pageId: string;
  adminId: string;
};

export type PublishPageResult =
  { ok: true; pageId: string; slug: string } | { ok: false; error: string };

/**
 * Copy each block's draft → published, mark page published, write a revision,
 * then revalidate the page slug tag and SITE_ALL.
 */
export async function publishPage({
  pageId,
  adminId,
}: PublishPageInput): Promise<PublishPageResult> {
  const { data: page, error: pageErr } = await supabaseAdmin
    .from(TABLES.SITE_PAGES)
    .select("*")
    .eq("id", pageId)
    .maybeSingle();

  if (pageErr || !page) {
    return { ok: false, error: pageErr?.message ?? "Page not found" };
  }

  const pageRow = page as SitePageRow;

  const { data: blocks, error: blocksErr } = await supabaseAdmin
    .from(TABLES.SITE_BLOCKS)
    .select("*")
    .eq("page_id", pageId)
    .order("sort", { ascending: true });

  if (blocksErr) {
    return { ok: false, error: blocksErr.message };
  }

  const blockRows = (blocks as SiteBlockRow[] | null) ?? [];
  const now = new Date().toISOString();

  for (const block of blockRows) {
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_BLOCKS)
      .update({
        published: block.draft as Json,
        updated_at: now,
      })
      .eq("id", block.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const { error: statusErr } = await supabaseAdmin
    .from(TABLES.SITE_PAGES)
    .update({
      status: "published",
      published_at: now,
      updated_by: adminId,
      updated_at: now,
    })
    .eq("id", pageId);

  if (statusErr) {
    return { ok: false, error: statusErr.message };
  }

  const snapshot: Json = {
    page: {
      id: pageRow.id,
      slug: pageRow.slug,
      title: pageRow.title,
      seo: pageRow.seo,
      status: "published",
      published_at: now,
    },
    blocks: blockRows.map((b) => ({
      id: b.id,
      type: b.type,
      sort: b.sort,
      visible: b.visible,
      published: b.draft,
    })),
  };

  const { error: revErr } = await supabaseAdmin.from(TABLES.SITE_REVISIONS).insert({
    entity_type: "site_page",
    entity_id: pageId,
    snapshot,
    created_by: adminId,
  });

  if (revErr) {
    return { ok: false, error: revErr.message };
  }

  revalidateTag(sitePage(pageRow.slug), "max");
  revalidateTag(SITE_ALL, "max");

  return { ok: true, pageId, slug: pageRow.slug };
}

export type SaveDraftBlockInput = {
  blockId: string;
  draft: Json;
  visible?: boolean;
  type?: string;
  sort?: number;
};

export type SaveDraftBlockResult =
  { ok: true; blockId: string; pageId: string } | { ok: false; error: string };

export async function saveDraftBlock({
  blockId,
  draft,
  visible,
  type,
  sort,
}: SaveDraftBlockInput): Promise<SaveDraftBlockResult> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from(TABLES.SITE_BLOCKS)
    .select("id, page_id")
    .eq("id", blockId)
    .maybeSingle();

  if (readErr || !existing) {
    return { ok: false, error: readErr?.message ?? "Block not found" };
  }

  const patch: Database["public"]["Tables"]["site_blocks"]["Update"] = {
    draft,
    updated_at: new Date().toISOString(),
  };
  if (typeof visible === "boolean") patch.visible = visible;
  if (typeof type === "string") patch.type = type;
  if (typeof sort === "number") patch.sort = sort;

  const { error } = await supabaseAdmin.from(TABLES.SITE_BLOCKS).update(patch).eq("id", blockId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, blockId, pageId: String((existing as { page_id: string }).page_id) };
}

export type AdminPageSummary = Pick<
  SitePageRow,
  "id" | "slug" | "title" | "status" | "published_at" | "updated_at" | "seo"
>;

export type AdminBlockRow = Pick<
  SiteBlockRow,
  "id" | "page_id" | "type" | "sort" | "visible" | "draft" | "published" | "updated_at"
>;

export async function listAdminPages(): Promise<AdminPageSummary[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_PAGES)
    .select("id, slug, title, status, published_at, updated_at, seo")
    .order("slug", { ascending: true });
  if (error) {
    console.error("[listAdminPages]", error.message);
    return [];
  }
  return (data as AdminPageSummary[] | null) ?? [];
}

export async function listAdminBlocks(pageId: string): Promise<AdminBlockRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_BLOCKS)
    .select("id, page_id, type, sort, visible, draft, published, updated_at")
    .eq("page_id", pageId)
    .order("sort", { ascending: true });
  if (error) {
    console.error("[listAdminBlocks]", error.message);
    return [];
  }
  return (data as AdminBlockRow[] | null) ?? [];
}

export type SiteRevisionRow = Database["public"]["Tables"]["site_revisions"]["Row"];

export async function listPageRevisions(pageId: string, limit = 20): Promise<SiteRevisionRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_REVISIONS)
    .select("*")
    .eq("entity_type", "site_page")
    .eq("entity_id", pageId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listPageRevisions]", error.message);
    return [];
  }
  return (data as SiteRevisionRow[] | null) ?? [];
}

export type CreateBlockInput = {
  pageId: string;
  type: string;
  draft?: Json;
  sort?: number;
};

export async function createBlock({
  pageId,
  type,
  draft = {},
  sort,
}: CreateBlockInput): Promise<{ ok: true; blockId: string } | { ok: false; error: string }> {
  let nextSort = sort;
  if (nextSort == null) {
    const { data: last } = await supabaseAdmin
      .from(TABLES.SITE_BLOCKS)
      .select("sort")
      .eq("page_id", pageId)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextSort = (last?.sort ?? -1) + 1;
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.SITE_BLOCKS)
    .insert({
      page_id: pageId,
      type,
      draft,
      published: null,
      visible: false,
      sort: nextSort,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  return { ok: true, blockId: data.id };
}

export async function deleteBlock(
  blockId: string,
): Promise<{ ok: true; pageId: string } | { ok: false; error: string }> {
  const { data: existing, error: readErr } = await supabaseAdmin
    .from(TABLES.SITE_BLOCKS)
    .select("id, page_id")
    .eq("id", blockId)
    .maybeSingle();
  if (readErr || !existing) return { ok: false, error: readErr?.message ?? "Block not found" };

  const { error } = await supabaseAdmin.from(TABLES.SITE_BLOCKS).delete().eq("id", blockId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, pageId: existing.page_id };
}

export async function reorderBlocks(
  pageId: string,
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_BLOCKS)
      .update({ sort: i, updated_at: now })
      .eq("id", orderedIds[i])
      .eq("page_id", pageId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

type RevisionSnapshot = {
  page?: { seo?: Json; title?: string };
  blocks?: Array<{
    id: string;
    type: string;
    sort: number;
    visible: boolean;
    published?: Json;
  }>;
};

/**
 * Apply a revision snapshot into **draft** fields only. Live published content
 * stays until the admin publishes again.
 */
export async function restorePageRevision({
  pageId,
  revisionId,
  adminId,
}: {
  pageId: string;
  revisionId: string;
  adminId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: rev, error: revErr } = await supabaseAdmin
    .from(TABLES.SITE_REVISIONS)
    .select("*")
    .eq("id", revisionId)
    .eq("entity_type", "site_page")
    .eq("entity_id", pageId)
    .maybeSingle();

  if (revErr || !rev) return { ok: false, error: revErr?.message ?? "Revision not found" };

  const snapshot = rev.snapshot as RevisionSnapshot;
  const now = new Date().toISOString();

  if (snapshot.page?.seo != null || snapshot.page?.title) {
    const pagePatch: Database["public"]["Tables"]["site_pages"]["Update"] = {
      updated_at: now,
      updated_by: adminId,
      status: "draft",
    };
    if (snapshot.page.title) pagePatch.title = snapshot.page.title;
    if (snapshot.page.seo != null) pagePatch.seo = snapshot.page.seo;
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_PAGES)
      .update(pagePatch)
      .eq("id", pageId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_PAGES)
      .update({ status: "draft", updated_at: now, updated_by: adminId })
      .eq("id", pageId);
    if (error) return { ok: false, error: error.message };
  }

  for (const block of snapshot.blocks ?? []) {
    const draft = (block.published ?? {}) as Json;
    const { error } = await supabaseAdmin
      .from(TABLES.SITE_BLOCKS)
      .update({
        draft,
        type: block.type,
        sort: block.sort,
        visible: block.visible,
        updated_at: now,
      })
      .eq("id", block.id)
      .eq("page_id", pageId);
    if (error) {
      // Block may have been deleted; skip missing rows.
      if (!/0 rows|no rows/i.test(error.message)) {
        console.error("[restorePageRevision] block", block.id, error.message);
      }
    }
  }

  return { ok: true };
}

export async function updatePageSeo({
  pageId,
  seo,
  adminId,
}: {
  pageId: string;
  seo: Json;
  adminId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from(TABLES.SITE_PAGES)
    .update({
      seo,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    .eq("id", pageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
