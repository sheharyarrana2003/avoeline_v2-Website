import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { writeConnectionAudit } from "./audit.service";
import { notifyConnectionNeedsReconnect } from "./connections.service";

export type ConnectionHealthSummary = {
  active: number;
  needsReconnect: number;
  blocked: number;
  disabled: number;
  sheetSyncPaused: number;
  linkedNoAccess: number;
  metrics24h: {
    connects: number;
    failuresByReason: Record<string, number>;
    sends: number;
    quotaEvents: number;
  };
};

/** Daily health snapshot for Connections (C6). Does not touch tokens. */
export async function collectConnectionHealth(): Promise<ConnectionHealthSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: conns }, { count: pausedSheets }, { count: noAccess }, { data: audits }] =
    await Promise.all([
      supabaseAdmin.from(TABLES.INTEGRATION_CONNECTIONS).select("id, status"),
      supabaseAdmin
        .from(TABLES.SHEET_SYNCS)
        .select("id", { count: "exact", head: true })
        .eq("status", "paused"),
      supabaseAdmin
        .from(TABLES.LINKED_FILES)
        .select("id", { count: "exact", head: true })
        .eq("status", "no_access"),
      supabaseAdmin
        .from(TABLES.CONNECTION_AUDIT)
        .select("action, details")
        .gte("created_at", since)
        .limit(5000),
    ]);

  const summary: ConnectionHealthSummary = {
    active: 0,
    needsReconnect: 0,
    blocked: 0,
    disabled: 0,
    sheetSyncPaused: pausedSheets || 0,
    linkedNoAccess: noAccess || 0,
    metrics24h: {
      connects: 0,
      failuresByReason: {},
      sends: 0,
      quotaEvents: 0,
    },
  };

  for (const c of conns || []) {
    const s = String(c.status);
    if (s === "active") summary.active += 1;
    else if (s === "needs_reconnect") summary.needsReconnect += 1;
    else if (s === "blocked_by_admin") summary.blocked += 1;
    else if (s === "disabled" || s === "revoked") summary.disabled += 1;
  }

  for (const a of audits || []) {
    const action = String(a.action || "");
    if (action === "connect") summary.metrics24h.connects += 1;
    if (
      action === "send" ||
      action === "email_sent" ||
      action === "batch_send" ||
      action.includes("send")
    ) {
      summary.metrics24h.sends += 1;
    }
    if (action === "scope_rejected" || action.includes("fail") || action.includes("error")) {
      const reason = action;
      summary.metrics24h.failuresByReason[reason] =
        (summary.metrics24h.failuresByReason[reason] || 0) + 1;
    }
    if (action.includes("quota") || action === "quota_exhausted") {
      summary.metrics24h.quotaEvents += 1;
    }
    const details = (a.details || {}) as Record<string, unknown>;
    if (details.quotaRemaining === 0 || details.quotaExhausted) {
      summary.metrics24h.quotaEvents += 1;
    }
  }

  return summary;
}

export async function runConnectionsHealthJob(): Promise<ConnectionHealthSummary> {
  const summary = await collectConnectionHealth();
  await writeConnectionAudit({
    ownerType: "user",
    ownerId: "00000000-0000-0000-0000-000000000000",
    action: "health_snapshot",
    details: { ...summary },
  });

  const { data: needs } = await supabaseAdmin
    .from(TABLES.INTEGRATION_CONNECTIONS)
    .select("id")
    .eq("status", "needs_reconnect")
    .limit(100);
  for (const row of needs || []) {
    await notifyConnectionNeedsReconnect(String(row.id));
  }

  return summary;
}
