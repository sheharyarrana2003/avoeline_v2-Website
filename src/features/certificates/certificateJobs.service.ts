import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { logger } from "@/src/lib/logger";
import { getCertificateById, renderCertPdfBytes } from "./certificates.service";

export type CertificateJobKind = "archive" | "share";

export async function enqueueCertificateJobs(opts: {
  eventId: string;
  certificateIds: string[];
  kind: CertificateJobKind;
}): Promise<number> {
  const ids = [...new Set(opts.certificateIds.filter(Boolean))];
  if (!ids.length) return 0;
  const rows = ids.map((certificateId) => ({
    event_id: opts.eventId,
    certificate_id: certificateId,
    kind: opts.kind,
    status: "pending",
    attempts: 0,
    not_before: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin.from(TABLES.CERTIFICATE_JOBS).insert(rows as never);
  if (error) {
    logger.error("[certificateJobs] enqueue failed", { err: error.message });
    return 0;
  }
  return rows.length;
}

async function patchCertExtra(
  certificateId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select("extra")
    .eq("id", certificateId)
    .maybeSingle();
  const prior =
    data?.extra && typeof data.extra === "object" && !Array.isArray(data.extra)
      ? { ...(data.extra as Record<string, unknown>) }
      : {};
  await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .update({
      extra: { ...prior, ...patch },
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", certificateId);
}

async function runArchiveJob(certificateId: string, eventId: string): Promise<void> {
  const cert = await getCertificateById(certificateId);
  if (!cert || cert.eventId !== eventId) throw new Error("Certificate not found.");
  if (cert.status === "revoked") throw new Error("Certificate revoked.");

  const priorExtra = await readExtra(certificateId);
  if (priorExtra.driveRef || priorExtra.storedFileId) return;

  const pdf = await renderCertPdfBytes(cert);
  const { uploadEventAssetToOrganizerDrive } =
    await import("@/src/features/connections/server/eventDriveUpload.service");
  const uploaded = await uploadEventAssetToOrganizerDrive({
    organizerId: cert.organizerId,
    eventId,
    kind: "certificates",
    fileName: `${cert.certificateNumber || cert.id}.pdf`,
    mimeType: "application/pdf",
    bytes: Buffer.from(pdf),
    actorId: cert.organizerId,
    category: "certificate",
    entityType: "certificate",
    entityId: cert.id,
    allowFallback: true,
    linkLibrary: false,
  });
  await patchCertExtra(certificateId, {
    driveRef: uploaded.storageRef,
    driveUrl: uploaded.webUrl || uploaded.storageRef,
    storedFileId: uploaded.fileId,
    providerFileId: uploaded.providerFileId,
  });
}

async function readExtra(certificateId: string): Promise<Record<string, unknown>> {
  const { data } = await supabaseAdmin
    .from(TABLES.CERTIFICATES)
    .select("extra")
    .eq("id", certificateId)
    .maybeSingle();
  if (data?.extra && typeof data.extra === "object" && !Array.isArray(data.extra)) {
    return data.extra as Record<string, unknown>;
  }
  return {};
}

async function runShareJob(certificateId: string, eventId: string): Promise<void> {
  const cert = await getCertificateById(certificateId);
  if (!cert || cert.eventId !== eventId) throw new Error("Certificate not found.");
  const extra = await readExtra(certificateId);
  if (extra.driveShareUrl) return;

  let providerFileId = extra.providerFileId ? String(extra.providerFileId) : "";
  if (!providerFileId && String(extra.driveRef || "").startsWith("drive:")) {
    providerFileId = String(extra.driveRef).slice("drive:".length);
  }
  if (!providerFileId && String(extra.driveRef || "").startsWith("file:")) {
    const { fileStore } = await import("@/src/features/files/fileStore");
    const row = await fileStore.get(String(extra.driveRef).slice("file:".length));
    if (row?.provider === "drive") providerFileId = row.providerFileId;
  }
  if (!providerFileId) {
    // Archive first, then share on next attempt.
    await runArchiveJob(certificateId, eventId);
    const again = await readExtra(certificateId);
    providerFileId = again.providerFileId
      ? String(again.providerFileId)
      : String(again.driveRef || "").startsWith("drive:")
        ? String(again.driveRef).slice("drive:".length)
        : "";
  }
  if (!providerFileId) throw new Error("No Drive file to share.");

  const { listConnections, getAccessTokenForConnection } =
    await import("@/src/features/connections/server/connections.service");
  const conns = await listConnections({
    ownerType: "user",
    ownerId: cert.organizerId,
    includeQuota: false,
  });
  const drive = conns.find(
    (c) =>
      c.status === "active" &&
      (c.capabilities || []).some((cap) => cap.capability === "drive.files" && cap.enabled),
  );
  if (!drive) throw new Error("Drive not connected.");
  const accessToken = await getAccessTokenForConnection(drive.id);
  if (!accessToken) throw new Error("Could not refresh Drive token.");

  const { GoogleDriveClient } = await import("@/src/features/connections/providers/google/drive");
  const shareUrl = await GoogleDriveClient.shareAnyoneWithLink(accessToken, providerFileId);
  await patchCertExtra(certificateId, {
    driveShareUrl: shareUrl,
    driveSharedAt: new Date().toISOString(),
  });

  const { writeConnectionAudit } = await import("@/src/features/connections/server/audit.service");
  await writeConnectionAudit({
    connectionId: drive.id,
    ownerType: "user",
    ownerId: cert.organizerId,
    actorId: cert.organizerId,
    action: "certificate_drive_share",
    details: { certificateId, eventId, providerFileId },
  });
}

/** Process pending certificate jobs (throttle ~10 per cron tick). */
export async function processCertificateJobs(limit = 10): Promise<{
  processed: number;
  done: number;
  failed: number;
}> {
  const now = new Date().toISOString();
  const { data: jobs } = await supabaseAdmin
    .from(TABLES.CERTIFICATE_JOBS)
    .select("id, event_id, certificate_id, kind, attempts")
    .eq("status", "pending")
    .lte("not_before", now)
    .order("created_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 40));

  let done = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    const id = String(job.id);
    await supabaseAdmin
      .from(TABLES.CERTIFICATE_JOBS)
      .update({ status: "running", updated_at: now } as never)
      .eq("id", id)
      .eq("status", "pending");

    try {
      if (job.kind === "archive") {
        await runArchiveJob(String(job.certificate_id), String(job.event_id));
      } else if (job.kind === "share") {
        await runShareJob(String(job.certificate_id), String(job.event_id));
      } else {
        throw new Error(`Unknown kind ${job.kind}`);
      }
      await supabaseAdmin
        .from(TABLES.CERTIFICATE_JOBS)
        .update({ status: "done", updated_at: new Date().toISOString(), last_error: null } as never)
        .eq("id", id);
      done += 1;
    } catch (err) {
      const attempts = Number(job.attempts || 0) + 1;
      const message = err instanceof Error ? err.message : "failed";
      const backoffMin = Math.min(60, 2 ** Math.min(attempts, 5));
      const notBefore = new Date(Date.now() + backoffMin * 60_000).toISOString();
      const status = attempts >= 8 ? "failed" : "pending";
      await supabaseAdmin
        .from(TABLES.CERTIFICATE_JOBS)
        .update({
          status,
          attempts,
          last_error: message.slice(0, 500),
          not_before: notBefore,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id);
      failed += 1;
      logger.warn("[certificateJobs] job failed", { id, message, attempts });
    }
  }
  return { processed: (jobs ?? []).length, done, failed };
}

/** Ensure private archive exists; used at email send-time when includeDriveLink. */
export async function ensureCertificateArchived(
  certificateId: string,
  eventId: string,
): Promise<void> {
  const extra = await readExtra(certificateId);
  if (extra.driveRef || extra.storedFileId) return;
  await runArchiveJob(certificateId, eventId);
}

export async function ensureCertificateShared(
  certificateId: string,
  eventId: string,
): Promise<string | null> {
  const extra = await readExtra(certificateId);
  if (extra.driveShareUrl) return String(extra.driveShareUrl);
  await runShareJob(certificateId, eventId);
  const again = await readExtra(certificateId);
  return again.driveShareUrl ? String(again.driveShareUrl) : null;
}
