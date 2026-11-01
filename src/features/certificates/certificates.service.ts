import "server-only";

import { cache } from "react";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin, getSignedUrl, MEDIA_BUCKET } from "@/data/supabase";
import { absoluteUrl } from "@/src/lib/appUrl";
import { EventService } from "@/src/services/event.service";
import { RegService } from "@/src/services/registeration.service";
import {
  defaultLayout,
  type CertificateData,
  type CertificateLayout,
  type TemplateAssets,
} from "./layout.types";
import type { CertificateRow, CertificateTemplateRow } from "./types";
import { renderCertificatePdf, renderCertificateSvg } from "./renderCertificate";

const BULK_CAP = 200;

function asLayout(raw: unknown): CertificateLayout {
  if (
    raw &&
    typeof raw === "object" &&
    (raw as CertificateLayout).page &&
    Array.isArray((raw as CertificateLayout).elements)
  ) {
    return raw as CertificateLayout;
  }
  return defaultLayout();
}

function asAssets(raw: unknown): TemplateAssets {
  return raw && typeof raw === "object" ? (raw as TemplateAssets) : {};
}

function asData(raw: unknown): CertificateData {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    recipient_name: String(o.recipient_name ?? ""),
    role: String(o.role ?? ""),
    award: String(o.award ?? ""),
    event_title: String(o.event_title ?? ""),
    event_dates: String(o.event_dates ?? ""),
    issuer_name: String(o.issuer_name ?? ""),
    issuer_title: String(o.issuer_title ?? ""),
    certificate_number: String(o.certificate_number ?? ""),
    verify_url: String(o.verify_url ?? ""),
    custom_fields:
      o.custom_fields && typeof o.custom_fields === "object"
        ? Object.fromEntries(
            Object.entries(o.custom_fields as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v ?? ""),
            ]),
          )
        : {},
  };
}

function mapTemplate(row: Record<string, unknown>): CertificateTemplateRow {
  return {
    id: String(row.id),
    eventId: row.event_id ? String(row.event_id) : null,
    organizerId: String(row.organizer_id || ""),
    name: String(row.name || "Certificate"),
    version: Number(row.version ?? 1),
    layout: asLayout(row.layout),
    assets: asAssets(row.assets),
    status: row.status === "published" ? "published" : "draft",
    emailAttachPdf: Boolean(row.email_attach_pdf),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapCert(row: Record<string, unknown>): CertificateRow {
  const extra =
    row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)
      ? (row.extra as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    organizerId: String(row.organizer_id || ""),
    templateId: row.template_id ? String(row.template_id) : null,
    templateVersion: Number(row.template_version ?? 1),
    registrationId: row.registration_id ? String(row.registration_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    certificateNumber: String(row.certificate_number || ""),
    verificationCode: String(row.verification_code || ""),
    data: asData(row.data),
    status: row.status === "revoked" ? "revoked" : "issued",
    issuedAt: row.issued_at ? String(row.issued_at) : null,
    downloadCount: Number(row.download_count ?? 0),
    verificationCount: Number(row.verification_count ?? 0),
    emailedAt: extra.emailedAt ? String(extra.emailedAt) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

async function resolveAssetUrls(assets: TemplateAssets): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    Object.entries(assets).map(async ([key, path]) => {
      if (!path) return;
      if (/^https?:\/\//i.test(path)) {
        out[key] = path;
        return;
      }
      const signed = await getSignedUrl(MEDIA_BUCKET, path, 300).catch(() => null);
      if (signed) out[key] = signed;
    }),
  );
  return out;
}

export const getTemplateForEvent = cache(
  async (eventId: string): Promise<CertificateTemplateRow | null> => {
    const { data, error } = await supabaseAdmin
      .from(TABLES.CERTIFICATE_TEMPLATES)
      .select(
        "id, event_id, organizer_id, name, version, layout, assets, status, email_attach_pdf, created_at, updated_at",
      )
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapTemplate(data as Record<string, unknown>) : null;
  },
);

export async function ensureTemplateForEvent(
  eventId: string,
  organizerId: string,
): Promise<CertificateTemplateRow> {
  const existing = await getTemplateForEvent(eventId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const layout = defaultLayout();
  const id = randomUUID();
  const { error } = await supabaseAdmin.from(TABLES.CERTIFICATE_TEMPLATES).insert({
    id,
    event_id: eventId,
    organizer_id: organizerId,
    name: "Certificate",
    version: 1,
    layout,
    assets: {},
    status: "draft",
    email_attach_pdf: false,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  await supabaseAdmin.from(TABLES.CERTIFICATE_TEMPLATE_VERSIONS).insert({
    template_id: id,
    version: 1,
    layout,
    assets: {},
    created_at: now,
  });
  return (await getTemplateForEvent(eventId))!;
}

export async function saveTemplateDraft(input: {
  eventId: string;
  organizerId: string;
  name?: string;
  layout: CertificateLayout;
  assets?: TemplateAssets;
  emailAttachPdf?: boolean;
  /** When true, keep published/draft status (e.g. toggle email_attach_pdf only). */
  keepStatus?: boolean;
}): Promise<CertificateTemplateRow> {
  const tpl = await ensureTemplateForEvent(input.eventId, input.organizerId);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from(TABLES.CERTIFICATE_TEMPLATES)
    .update({
      name: input.name?.trim() || tpl.name,
      layout: input.layout,
      assets: input.assets ?? tpl.assets,
      email_attach_pdf: input.emailAttachPdf ?? tpl.emailAttachPdf,
      status: input.keepStatus ? tpl.status : "draft",
      updated_at: now,
    })
    .eq("id", tpl.id);
  if (error) throw error;
  return (await getTemplateForEvent(input.eventId))!;
}

export async function publishTemplate(
  eventId: string,
  organizerId: string,
): Promise<CertificateTemplateRow> {
  const tpl = await ensureTemplateForEvent(eventId, organizerId);
  const nextVersion = tpl.version + (tpl.status === "published" ? 1 : 0);
  // First publish keeps version 1; subsequent publish bumps
  const version =
    tpl.status === "draft" && tpl.version === 1
      ? 1
      : Math.max(1, nextVersion === tpl.version ? tpl.version + 1 : nextVersion);
  const publishedVersion = tpl.status === "published" ? tpl.version + 1 : tpl.version;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from(TABLES.CERTIFICATE_TEMPLATES)
    .update({
      version: publishedVersion,
      status: "published",
      updated_at: now,
    })
    .eq("id", tpl.id);
  if (error) throw error;
  await supabaseAdmin.from(TABLES.CERTIFICATE_TEMPLATE_VERSIONS).upsert(
    {
      template_id: tpl.id,
      version: publishedVersion,
      layout: tpl.layout,
      assets: tpl.assets,
      created_at: now,
    },
    { onConflict: "template_id,version" },
  );
  return (await getTemplateForEvent(eventId))!;
}

export async function getTemplateVersion(
  templateId: string,
  version: number,
): Promise<{ layout: CertificateLayout; assets: TemplateAssets } | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.CERTIFICATE_TEMPLATE_VERSIONS)
    .select("layout, assets")
    .eq("template_id", templateId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { layout: asLayout(data.layout), assets: asAssets(data.assets) };
}

export const listCertificatesForEvent = cache(
  async (eventId: string): Promise<CertificateRow[]> => {
    const { data, error } = await supabaseAdmin
      .from(TABLES.CERTIFICATES)
      .select(
        "id, event_id, organizer_id, template_id, template_version, registration_id, user_id, certificate_number, verification_code, data, status, issued_at, download_count, verification_count, extra, created_at, updated_at",
      )
      .eq("event_id", eventId)
      .order("issued_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapCert(r as Record<string, unknown>));
  },
);

const CERT_SELECT =
  "id, event_id, organizer_id, template_id, template_version, registration_id, user_id, certificate_number, verification_code, data, status, issued_at, download_count, verification_count, extra, created_at, updated_at";

export async function getCertificateById(id: string): Promise<CertificateRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select(CERT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCert(data as Record<string, unknown>) : null;
}

export async function getCertificateByCode(code: string): Promise<CertificateRow | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select(CERT_SELECT)
    .eq("verification_code", code)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCert(data as Record<string, unknown>) : null;
}

export async function certsForUser(userId: string): Promise<CertificateRow[]> {
  const id = String(userId ?? "").trim();
  if (!id) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select(CERT_SELECT)
    .eq("user_id", id)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapCert(r as Record<string, unknown>));
}

export async function getCertsOfEventByRegistration(
  eventId: string,
): Promise<Map<string, CertificateRow>> {
  const list = await listCertificatesForEvent(eventId);
  const map = new Map<string, CertificateRow>();
  for (const c of list) {
    if (c.registrationId) map.set(c.registrationId, c);
  }
  return map;
}

export async function markCertificatesEmailed(ids: string[]): Promise<void> {
  const stampedAt = new Date().toISOString();
  await Promise.all(
    ids.map(async (id) => {
      const { data: existing } = await supabaseAdmin
        .from(TABLES.CERTIFICATES)
        .select("extra")
        .eq("id", id)
        .maybeSingle();
      const extra =
        existing?.extra && typeof existing.extra === "object" && !Array.isArray(existing.extra)
          ? (existing.extra as Record<string, unknown>)
          : {};
      await supabaseAdmin
        .from(TABLES.CERTIFICATES)
        .update({ extra: { ...extra, emailedAt: stampedAt }, updated_at: stampedAt })
        .eq("id", id);
    }),
  );
}

export async function loadRenderBundle(cert: CertificateRow): Promise<{
  layout: CertificateLayout;
  assets: Record<string, string>;
  data: CertificateData;
  version: number;
}> {
  let layout = defaultLayout();
  let assetsRaw: TemplateAssets = {};
  if (cert.templateId) {
    const ver = await getTemplateVersion(cert.templateId, cert.templateVersion);
    if (ver) {
      layout = ver.layout;
      assetsRaw = ver.assets;
    } else {
      const tpl = await supabaseAdmin
        .from(TABLES.CERTIFICATE_TEMPLATES)
        .select("layout, assets")
        .eq("id", cert.templateId)
        .maybeSingle();
      if (tpl.data) {
        layout = asLayout(tpl.data.layout);
        assetsRaw = asAssets(tpl.data.assets);
      }
    }
  }
  const verifyUrl = await absoluteUrl(`/verify/${cert.verificationCode}`);
  const data: CertificateData = {
    ...cert.data,
    certificate_number: cert.certificateNumber,
    verify_url: verifyUrl,
  };
  const assets = await resolveAssetUrls(assetsRaw);
  return { layout, assets, data, version: cert.templateVersion };
}

export async function renderCertSvg(cert: CertificateRow) {
  const bundle = await loadRenderBundle(cert);
  return { ...renderCertificateSvg(bundle.layout, bundle.data, bundle.assets), ...bundle };
}

export async function renderCertPdfBytes(cert: CertificateRow): Promise<Uint8Array> {
  const bundle = await loadRenderBundle(cert);
  return renderCertificatePdf(bundle.layout, bundle.data, bundle.assets);
}

export async function bumpDownloadCount(id: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select("download_count")
    .eq("id", id)
    .maybeSingle();
  await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .update({
      download_count: Number(data?.download_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function bumpVerificationCount(id: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select("verification_count")
    .eq("id", id)
    .maybeSingle();
  await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .update({
      verification_count: Number(data?.verification_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function issueCertificatesForRegistrations(input: {
  eventId: string;
  organizerId: string;
  registrationIds: string[];
  roles?: Record<string, string>;
}): Promise<{ issued: number; skipped: number }> {
  const ids = [...new Set(input.registrationIds.map(String).filter(Boolean))].slice(0, BULK_CAP);
  if (!ids.length) return { issued: 0, skipped: 0 };
  const [event, tpl, regs, existing] = await Promise.all([
    EventService.getEventByID(input.eventId),
    ensureTemplateForEvent(input.eventId, input.organizerId),
    RegService.getRegsOfEvent(input.eventId),
    listCertificatesForEvent(input.eventId),
  ]);
  if (!event) throw new Error("Event not found");
  const have = new Set(existing.map((c) => c.registrationId).filter(Boolean));
  const byId = new Map(regs.map((r) => [r.registrationId, r]));
  const now = new Date().toISOString();
  const rows = [];
  let skipped = 0;
  for (const rid of ids) {
    if (have.has(rid)) {
      skipped += 1;
      continue;
    }
    const reg = byId.get(rid);
    if (!reg || reg.status === "cancelled") {
      skipped += 1;
      continue;
    }
    const id = randomUUID();
    const role = input.roles?.[rid] || "Attendee";
    const data: CertificateData = {
      recipient_name: reg.attendee?.name || "Participant",
      role,
      event_title: event.title || "Event",
      event_dates: [event.schedule?.startDate, event.schedule?.endDate].filter(Boolean).join(" – "),
      issuer_name: "",
      issuer_title: "",
      custom_fields: {},
    };
    rows.push({
      id,
      event_id: input.eventId,
      organizer_id: input.organizerId,
      template_id: tpl.id,
      template_version: tpl.version,
      registration_id: rid,
      user_id: reg.userId || null,
      certificate_number: `CERT-${id.slice(0, 8).toUpperCase()}`,
      verification_code: `VCODE-${id}`,
      data,
      status: "issued",
      issued_at: now,
      download_count: 0,
      verification_count: 0,
      created_at: now,
      updated_at: now,
      extra: {},
    });
  }
  if (rows.length) {
    const { error } = await supabaseAdmin.from(TABLES.CERTIFICATES).insert(rows);
    if (error) throw error;
  }
  return { issued: rows.length, skipped };
}

export async function rebindCertificatesToLatestTemplate(eventId: string): Promise<number> {
  const tpl = await getTemplateForEvent(eventId);
  if (!tpl) return 0;
  const { data, error } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .update({
      template_id: tpl.id,
      template_version: tpl.version,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("status", "issued")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export { BULK_CAP };
