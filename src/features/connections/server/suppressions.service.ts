import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { getAppOrigin } from "@/src/features/website/consent.service";
import {
  buildOrganizerUnsubscribeToken,
  normalizeEmail,
  parseAndVerifyOrganizerUnsubToken,
} from "../lib/suppressions.logic";
import { isTimeSensitiveKind } from "../lib/capacityMath";

function unsubSecret(): string {
  return (
    process.env.CONNECTIONS_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.CONNECTIONS_ENCRYPTION_KEY?.trim() ||
    process.env.EMAIL_CONNECTION_SECRET?.trim() ||
    "avoeline-organizer-unsub-dev"
  );
}

export function organizerUnsubscribeUrl(email: string, ownerId: string): string {
  const token = buildOrganizerUnsubscribeToken({
    email,
    ownerId,
    secret: unsubSecret(),
  });
  return `${getAppOrigin()}/unsubscribe/organizer?token=${encodeURIComponent(token)}`;
}

/** Append one-click unsubscribe footer for non-transactional bulk kinds. */
export function withUnsubscribeFooter(opts: {
  html?: string;
  text?: string;
  email: string;
  ownerId: string;
  kind: string;
}): { html?: string; text?: string } {
  if (isTimeSensitiveKind(opts.kind)) {
    return { html: opts.html, text: opts.text };
  }
  const url = organizerUnsubscribeUrl(opts.email, opts.ownerId);
  const line = `Prefer not to get these updates? <a href="${url}">Unsubscribe</a>`;
  const textLine = `Prefer not to get these updates? Unsubscribe: ${url}`;
  return {
    html: opts.html
      ? `${opts.html}<p style="font-size:12px;color:#666;margin-top:24px">${line}</p>`
      : undefined,
    text: opts.text ? `${opts.text}\n\n${textLine}` : textLine,
  };
}

export async function applyOrganizerUnsubscribe(
  token: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const parsed = parseAndVerifyOrganizerUnsubToken(token, unsubSecret());
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const email = normalizeEmail(parsed.email);
  await supabaseAdmin.from(TABLES.EMAIL_SUPPRESSIONS).upsert(
    {
      owner_id: parsed.ownerId,
      email_normalized: email,
      reason: "unsubscribe",
      created_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,email_normalized" },
  );
  return { ok: true, email };
}
