import "server-only";

import { logger } from "@/src/lib/logger";
import { drivePut } from "./DriveStore";
import { supabaseDelete, supabaseDownload } from "./SupabaseStore";
import { listNeedsPromote, updateStoredFile } from "./storedFiles.repo";
import type { EventFolderKind, FileCategory } from "./types";

function folderKindForCategory(category: FileCategory): EventFolderKind {
  switch (category) {
    case "payment_proof":
      return "payment_proofs";
    case "certificate":
      return "certificates";
    case "media":
      return "media";
    case "export":
      return "exports";
    case "submission":
      return "submissions";
    default:
      return "media";
  }
}

/**
 * Move `needs_promote` Supabase objects to Drive, then delete the temp object.
 */
export async function promoteFallbackFiles(limit = 20): Promise<{
  attempted: number;
  promoted: number;
  failed: number;
}> {
  const rows = await listNeedsPromote(limit);
  let promoted = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.connectionId || !row.organizerId || !row.eventId) {
      failed += 1;
      continue;
    }
    try {
      const bytes = await supabaseDownload(row.providerFileId);
      const uploaded = await drivePut({
        connectionId: row.connectionId,
        organizerId: row.organizerId,
        eventId: row.eventId,
        folderKind: folderKindForCategory(row.category),
        name: row.name,
        mime: row.mime,
        bytes,
        actorId: row.organizerId,
        linkLibrary: true,
      });
      await updateStoredFile(row.id, {
        provider: "drive",
        provider_file_id: uploaded.providerFileId,
        needs_promote: false,
        promoted_at: new Date().toISOString(),
        expires_at: null,
        extra: {
          ...row.extra,
          webUrl: uploaded.webUrl,
          promotedFrom: row.providerFileId,
        },
      });
      await supabaseDelete(row.providerFileId).catch((err) => {
        logger.error("[promote] delete fallback object", {
          key: row.providerFileId,
          err: err instanceof Error ? err.message : "unknown",
        });
      });
      promoted += 1;
    } catch (err) {
      failed += 1;
      logger.error("[promote] failed", {
        fileId: row.id,
        err: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return { attempted: rows.length, promoted, failed };
}
