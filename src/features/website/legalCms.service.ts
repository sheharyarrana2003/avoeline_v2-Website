import "server-only";

import { revalidateTag } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { createPlatformAlert } from "@/src/features/admin/platformAlerts.service";
import { sendPlatformEmail } from "@/src/lib/email/resend";
import { logger } from "@/src/lib/logger";
import { SITE_ALL, SITE_SETTINGS, sitePage } from "./cacheTags";
import { LEGAL_NOTIFY_CAP, capNotifyRecipients } from "./cms.logic";
import { sanitizeLegalMarkdown } from "./legalMarkdown";

export type LegalDocumentRow = {
  id: string;
  slug: string;
  title: string;
  current_version_id: string | null;
};

export type LegalVersionRow = {
  id: string;
  document_id: string;
  version: number;
  body_md: string;
  change_summary: string | null;
  effective_date: string | null;
  published_by: string | null;
  published_at: string;
};

export async function listLegalDocuments(): Promise<
  Array<LegalDocumentRow & { current?: LegalVersionRow | null }>
> {
  const { data: docs, error } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENTS)
    .select("id, slug, title, current_version_id")
    .order("slug", { ascending: true });
  if (error) {
    console.error("[listLegalDocuments]", error.message);
    return [];
  }
  const rows = (docs as LegalDocumentRow[] | null) ?? [];
  const versionIds = rows.map((d) => d.current_version_id).filter(Boolean) as string[];
  const versionMap = new Map<string, LegalVersionRow>();
  if (versionIds.length) {
    const { data: versions } = await supabaseAdmin
      .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
      .select("*")
      .in("id", versionIds);
    for (const v of (versions as LegalVersionRow[] | null) ?? []) {
      versionMap.set(v.id, v);
    }
  }
  return rows.map((d) => ({
    ...d,
    current: d.current_version_id ? (versionMap.get(d.current_version_id) ?? null) : null,
  }));
}

export async function listLegalVersions(documentId: string): Promise<LegalVersionRow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
    .select("*")
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  if (error) {
    console.error("[listLegalVersions]", error.message);
    return [];
  }
  return (data as LegalVersionRow[] | null) ?? [];
}

export type PublishLegalInput = {
  documentId: string;
  bodyMd: string;
  changeSummary: string;
  effectiveDate: string;
  adminId: string;
  notifyTenants: boolean;
};

export type PublishLegalResult =
  | {
      ok: true;
      versionId: string;
      version: number;
      notify: { sent: number; skipped: number; capped: boolean };
    }
  | { ok: false; error: string };

async function loadNotifyRecipients(): Promise<Array<{ userId: string; email: string }>> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, email, user_type")
    .in("user_type", ["organizer", "vendor"])
    .not("email", "is", null)
    .limit(500);
  if (error) {
    console.error("[loadNotifyRecipients]", error.message);
    return [];
  }
  return ((data as Array<{ id: string; email: string | null }> | null) ?? [])
    .map((u) => ({ userId: u.id, email: String(u.email ?? "").trim() }))
    .filter((u) => u.email.includes("@"));
}

async function fanOutLegalNotify(opts: {
  slug: string;
  title: string;
  version: number;
  changeSummary: string;
}): Promise<{ sent: number; skipped: number; capped: boolean }> {
  const all = await loadNotifyRecipients();
  const capped = capNotifyRecipients(all, LEGAL_NOTIFY_CAP);
  let sent = 0;

  for (const recipient of capped.selected) {
    const mail = await sendPlatformEmail({
      lane: "notifications",
      to: recipient.email,
      subject: `Updated legal document: ${opts.title}`,
      text: [
        `We published version ${opts.version} of ${opts.title}.`,
        opts.changeSummary ? `Summary: ${opts.changeSummary}` : "",
        `Read it at /${opts.slug === "privacy" ? "privacy" : opts.slug === "terms" ? "terms" : opts.slug}.`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (mail.ok) sent += 1;

    await createPlatformAlert({
      kind: "legal_update",
      title: `${opts.title} updated`,
      body: opts.changeSummary || `Version ${opts.version} is now in effect.`,
      href: opts.slug === "cookies" ? "/privacy" : `/${opts.slug}`,
      targetUserId: recipient.userId,
    });
  }

  logger.info("[legalNotify]", {
    kind: "legal_update",
    total: all.length,
    sent,
    skipped: capped.skipped,
    capped: capped.capped,
    cap: LEGAL_NOTIFY_CAP,
  });

  return { sent, skipped: capped.skipped, capped: capped.capped };
}

export async function publishLegalVersion(input: PublishLegalInput): Promise<PublishLegalResult> {
  const { data: doc, error: docErr } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENTS)
    .select("id, slug, title, current_version_id")
    .eq("id", input.documentId)
    .maybeSingle();
  if (docErr || !doc) return { ok: false, error: docErr?.message ?? "Document not found" };

  const { data: last } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
    .select("version")
    .eq("document_id", input.documentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (last?.version ?? 0) + 1;
  const body = sanitizeLegalMarkdown(input.bodyMd);

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
    .insert({
      document_id: input.documentId,
      version: nextVersion,
      body_md: body,
      change_summary: input.changeSummary.trim() || null,
      effective_date: input.effectiveDate || null,
      published_by: input.adminId,
    })
    .select("id, version")
    .maybeSingle();

  if (insErr || !inserted) return { ok: false, error: insErr?.message ?? "Insert failed" };

  const { error: linkErr } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENTS)
    .update({ current_version_id: inserted.id })
    .eq("id", input.documentId);
  if (linkErr) return { ok: false, error: linkErr.message };

  let notify = { sent: 0, skipped: 0, capped: false };
  if (input.notifyTenants) {
    notify = await fanOutLegalNotify({
      slug: doc.slug,
      title: doc.title,
      version: inserted.version,
      changeSummary: input.changeSummary.trim(),
    });

    const starts = new Date();
    const ends = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await supabaseAdmin.from(TABLES.SITE_SETTINGS).upsert({
      key: "announcement",
      value: {
        message: `${doc.title} was updated (v${inserted.version}).`,
        href: doc.slug === "cookies" ? "/privacy" : `/${doc.slug}`,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      },
      updated_by: input.adminId,
      updated_at: new Date().toISOString(),
    });
    revalidateTag(SITE_SETTINGS, "max");
  }

  revalidateTag(sitePage(doc.slug), "max");
  revalidateTag(SITE_ALL, "max");

  return {
    ok: true,
    versionId: inserted.id,
    version: inserted.version,
    notify,
  };
}

/** Attempts that must fail — versions are immutable. */
export async function tryMutateLegalVersion(
  versionId: string,
  mode: "update" | "delete",
): Promise<{ ok: false; error: string }> {
  if (mode === "delete") {
    const { error } = await supabaseAdmin
      .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
      .delete()
      .eq("id", versionId);
    return { ok: false, error: error?.message ?? "Delete blocked" };
  }
  const { error } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
    .update({ body_md: "tampered" })
    .eq("id", versionId);
  return { ok: false, error: error?.message ?? "Update blocked" };
}
