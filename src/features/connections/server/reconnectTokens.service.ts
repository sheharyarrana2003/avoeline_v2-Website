import "server-only";

import { createHash, randomBytes } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { writeConnectionAudit } from "./audit.service";
import type { ConnectionOwnerType } from "../types";

const TTL_MS = 72 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function mintReconnectToken(opts: {
  ownerType: ConnectionOwnerType;
  ownerId: string;
  connectionId?: string | null;
  createdBy: string;
}): Promise<{ token: string; expiresAt: string; path: string }> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  await supabaseAdmin.from(TABLES.CONNECTION_RECONNECT_TOKENS).insert({
    token_hash: hashToken(token),
    owner_type: opts.ownerType,
    owner_id: opts.ownerId,
    connection_id: opts.connectionId ?? null,
    created_by: opts.createdBy,
    expires_at: expiresAt,
  });
  await writeConnectionAudit({
    connectionId: opts.connectionId ?? null,
    ownerType: opts.ownerType,
    ownerId: opts.ownerId,
    actorId: opts.createdBy,
    action: "reconnect_link_created",
    details: { expiresAt },
  });

  const base =
    opts.ownerType === "org"
      ? `/department/settings/connections`
      : `/organizer/${opts.ownerId}/settings/connections`;
  // Club org pages use club path — caller may override via return path on page.
  const path = `${base}?reconnect=1&t=${token}`;
  return { token, expiresAt, path };
}

export async function consumeReconnectToken(opts: {
  token: string;
  ownerType: ConnectionOwnerType;
  ownerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const hash = hashToken(opts.token);
  const { data } = await supabaseAdmin
    .from(TABLES.CONNECTION_RECONNECT_TOKENS)
    .select("id, owner_type, owner_id, expires_at, used_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data) return { ok: false, error: "Invalid reconnect link." };
  if (data.owner_type !== opts.ownerType || data.owner_id !== opts.ownerId) {
    return { ok: false, error: "Reconnect link does not match this account." };
  }
  if (data.used_at) return { ok: false, error: "Reconnect link already used." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Reconnect link expired." };
  }
  await supabaseAdmin
    .from(TABLES.CONNECTION_RECONNECT_TOKENS)
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { ok: true };
}
