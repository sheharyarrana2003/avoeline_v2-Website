import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import {
  clampKeysetLimit,
  decodeKeysetCursor,
  encodeKeysetCursor,
  type KeysetCursor,
} from "@/src/lib/keyset";

export type RegistrationListRow = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
};

export type RegistrationListPage = {
  rows: RegistrationListRow[];
  nextCursor: string | null;
};

/**
 * Keyset page of registrations for an event (newest first).
 */
export async function listEventRegistrationsPage(input: {
  eventId: string;
  cursor?: string | null;
  limit?: number;
  status?: string | null;
}): Promise<RegistrationListPage> {
  const limit = clampKeysetLimit(input.limit);
  const cursor = decodeKeysetCursor(input.cursor);

  let q = supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id, event_id, name, email, status, created_at")
    .eq("event_id", input.eventId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (input.status) q = q.eq("status", input.status);
  if (cursor) {
    q = q.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const raw = data ?? [];
  const page = raw.slice(0, limit);
  const rows: RegistrationListRow[] = page.map((r) => ({
    id: String(r.id),
    eventId: String(r.event_id),
    name: String(r.name || ""),
    email: String(r.email || ""),
    status: String(r.status || ""),
    createdAt: String(r.created_at),
  }));

  let nextCursor: string | null = null;
  if (raw.length > limit && rows.length) {
    const last = rows[rows.length - 1]!;
    const c: KeysetCursor = { at: last.createdAt, id: last.id };
    nextCursor = encodeKeysetCursor(c);
  }
  return { rows, nextCursor };
}
