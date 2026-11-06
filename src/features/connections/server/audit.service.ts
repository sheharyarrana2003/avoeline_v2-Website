import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { ConnectionOwnerType } from "../types";

export async function writeConnectionAudit(opts: {
  connectionId?: string | null;
  ownerType: ConnectionOwnerType;
  ownerId: string;
  actorId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  // Never log tokens or email bodies
  const safe = { ...(opts.details || {}) };
  for (const key of Object.keys(safe)) {
    if (/token|secret|password|cipher|refresh|access/i.test(key)) delete safe[key];
  }
  await supabaseAdmin.from(TABLES.CONNECTION_AUDIT).insert({
    connection_id: opts.connectionId ?? null,
    owner_type: opts.ownerType,
    owner_id: opts.ownerId,
    actor_id: opts.actorId ?? null,
    action: opts.action,
    details: safe,
  });
}
