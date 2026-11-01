import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getServerEnv } from "@/src/env";
import type { Database } from "@/src/lib/database.types";
import {
  MARKETING_SCOPES,
  buildUnsubscribeToken,
  hashEmail,
  hashUnsubscribeToken,
  mintUnsubscribeToken,
  parseAndVerifyUnsubscribeToken,
  type MarketingScope,
} from "./consent.logic";

type MarketingRow = Database["public"]["Tables"]["marketing_consents"]["Row"];
type UserConsentRow = Database["public"]["Tables"]["user_consents"]["Row"];

function unsubSecret(): string {
  const env = getServerEnv();
  const raw =
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    env.EMAIL_CONNECTION_SECRET?.trim() ||
    env.CRON_SECRET?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 48);
  return raw;
}

export function getAppOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (url)
    return url.startsWith("http") ? url.replace(/\/$/, "") : `https://${url.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export async function getCurrentLegalVersions(): Promise<
  Array<{ slug: string; version: number; documentId: string }>
> {
  const { data: docs, error } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENTS)
    .select("id, slug, current_version_id")
    .in("slug", ["privacy", "terms"]);
  if (error || !docs?.length) {
    console.error("[getCurrentLegalVersions]", error?.message);
    return [];
  }
  const versionIds = docs
    .map((d) => d.current_version_id)
    .filter((id): id is string => Boolean(id));
  if (!versionIds.length) return [];
  const { data: versions } = await supabaseAdmin
    .from(TABLES.LEGAL_DOCUMENT_VERSIONS)
    .select("id, document_id, version")
    .in("id", versionIds);
  const byId = new Map((versions ?? []).map((v) => [v.id, v]));
  return docs
    .map((d) => {
      const v = d.current_version_id ? byId.get(d.current_version_id) : null;
      if (!v) return null;
      return { slug: d.slug, version: v.version, documentId: d.id };
    })
    .filter((x): x is { slug: string; version: number; documentId: string } => Boolean(x));
}

export async function recordLegalAcceptance(opts: {
  userId?: string | null;
  email: string;
  context: string;
  ipHash?: string | null;
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const versions = await getCurrentLegalVersions();
  if (!versions.length) {
    return { ok: false, error: "Legal documents are not published yet." };
  }
  const emailHash = hashEmail(opts.email);
  const rows = versions.map((v) => ({
    user_id: opts.userId ?? null,
    email_hash: emailHash,
    document_slug: v.slug,
    version: v.version,
    context: opts.context,
    ip_hash: opts.ipHash ?? null,
  }));
  const { error } = await supabaseAdmin.from(TABLES.USER_CONSENTS).insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: rows.length };
}

export async function grantMarketingConsent(opts: {
  email: string;
  userId?: string | null;
  scopes?: MarketingScope[];
  source: string;
}): Promise<
  { ok: true; ids: string[]; tokens: Record<string, string> } | { ok: false; error: string }
> {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Valid email required." };
  const scopes = opts.scopes?.length ? opts.scopes : [...MARKETING_SCOPES];
  const ids: string[] = [];
  const tokens: Record<string, string> = {};

  for (const scope of scopes) {
    const { data: existing } = await supabaseAdmin
      .from(TABLES.MARKETING_CONSENTS)
      .select("id, withdrawn_at")
      .eq("email", email)
      .eq("scope", scope)
      .is("withdrawn_at", null)
      .maybeSingle();

    if (existing?.id) {
      ids.push(existing.id);
      continue;
    }

    const minted = mintUnsubscribeToken();
    const signed = buildUnsubscribeToken({
      email,
      scope,
      secret: unsubSecret(),
    });
    tokens[scope] = signed;

    const { data, error } = await supabaseAdmin
      .from(TABLES.MARKETING_CONSENTS)
      .insert({
        email,
        user_id: opts.userId ?? null,
        scope,
        source: opts.source,
        unsubscribe_token_hash: minted.hash,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // Race on unique active index — treat as already granted.
      if (/unique|duplicate/i.test(error.message)) continue;
      return { ok: false, error: error.message };
    }
    if (data?.id) ids.push(data.id);

    // Prefer signed URL token hash for withdraw-by-URL
    if (data?.id) {
      await supabaseAdmin
        .from(TABLES.MARKETING_CONSENTS)
        .update({ unsubscribe_token_hash: hashUnsubscribeToken(signed) })
        .eq("id", data.id);
    }
  }

  return { ok: true, ids, tokens };
}

export function unsubscribeUrlFor(email: string, scope: MarketingScope = "community"): string {
  const token = buildUnsubscribeToken({ email, scope, secret: unsubSecret() });
  return `${getAppOrigin()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function withdrawByToken(
  rawToken: string,
): Promise<{ ok: true; email: string; scope: string } | { ok: false; error: string }> {
  const parsed = parseAndVerifyUnsubscribeToken(rawToken, unsubSecret());
  if (!parsed.ok) {
    // Fallback: treat as opaque minted token hash
    const hash = hashUnsubscribeToken(rawToken);
    const { data } = await supabaseAdmin
      .from(TABLES.MARKETING_CONSENTS)
      .select("id, email, scope")
      .eq("unsubscribe_token_hash", hash)
      .is("withdrawn_at", null)
      .maybeSingle();
    if (!data) return { ok: false, error: parsed.error };
    const { error } = await supabaseAdmin
      .from(TABLES.MARKETING_CONSENTS)
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, email: data.email, scope: data.scope };
  }

  const { data: rows, error: findErr } = await supabaseAdmin
    .from(TABLES.MARKETING_CONSENTS)
    .select("id, email, scope")
    .eq("email", parsed.email)
    .eq("scope", parsed.scope)
    .is("withdrawn_at", null);
  if (findErr) return { ok: false, error: findErr.message };
  if (!rows?.length) return { ok: false, error: "Consent already withdrawn or not found." };

  const { error } = await supabaseAdmin
    .from(TABLES.MARKETING_CONSENTS)
    .update({ withdrawn_at: new Date().toISOString() })
    .in(
      "id",
      rows.map((r) => r.id),
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true, email: parsed.email, scope: parsed.scope };
}

export async function withdrawById(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from(TABLES.MARKETING_CONSENTS)
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", id)
    .is("withdrawn_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listMarketingConsents(opts?: {
  scope?: string;
  source?: string;
  q?: string;
  includeWithdrawn?: boolean;
}): Promise<MarketingRow[]> {
  let query = supabaseAdmin
    .from(TABLES.MARKETING_CONSENTS)
    .select("*")
    .order("granted_at", { ascending: false })
    .limit(500);

  if (!opts?.includeWithdrawn) query = query.is("withdrawn_at", null);
  if (opts?.scope && opts.scope !== "all") query = query.eq("scope", opts.scope);
  if (opts?.source && opts.source !== "all") query = query.eq("source", opts.source);

  const { data, error } = await query;
  if (error) {
    console.error("[listMarketingConsents]", error.message);
    return [];
  }
  let rows = (data as MarketingRow[] | null) ?? [];
  const q = opts?.q?.trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.email.toLowerCase().includes(q));
  return rows;
}

export async function listActiveMarketingConsents(opts?: {
  scope?: string;
  source?: string;
  q?: string;
}): Promise<MarketingRow[]> {
  return listMarketingConsents({ ...opts, includeWithdrawn: false });
}

export type MarketingInsights = {
  events_by_month: Array<{ bucket: string; count: number }>;
  events_by_category: Array<{ bucket: string; count: number }>;
  events_by_city: Array<{ bucket: string; count: number }>;
  registrations_total: number;
  certificates_total: number;
  events_total: number;
};

export async function getMarketingInsights(): Promise<MarketingInsights | null> {
  const { data, error } = await supabaseAdmin.rpc("get_marketing_insights");
  if (error) {
    console.error("[getMarketingInsights]", error.message);
    return null;
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    events_by_month: Array.isArray(raw.events_by_month)
      ? (raw.events_by_month as Array<{ bucket: string; count: number }>)
      : [],
    events_by_category: Array.isArray(raw.events_by_category)
      ? (raw.events_by_category as Array<{ bucket: string; count: number }>)
      : [],
    events_by_city: Array.isArray(raw.events_by_city)
      ? (raw.events_by_city as Array<{ bucket: string; count: number }>)
      : [],
    registrations_total: Number(raw.registrations_total ?? 0),
    certificates_total: Number(raw.certificates_total ?? 0),
    events_total: Number(raw.events_total ?? 0),
  };
}

export type { UserConsentRow, MarketingRow };
