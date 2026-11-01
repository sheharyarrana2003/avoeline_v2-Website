"use server";

import { z } from "zod";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { parseTags } from "../cms.logic";
import { updateSiteMediaMeta, uploadSiteMedia } from "../mediaCms.service";

export const uploadSiteMediaAction = safeAction({
  input: z.object({
    // FormData bridge: clients pass base64 or we accept FormData via a separate path.
    // Prefer multipart through this action using serialized fields.
    alt: z.string().trim().min(1).max(300),
    tags: z.string().max(500).optional(),
    fileName: z.string().trim().min(1).max(200),
    mime: z.string().trim().min(1).max(100),
    base64: z.string().min(1).max(12_000_000),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const raw = Buffer.from(input.base64, "base64");
    const file = new File([raw], input.fileName, { type: input.mime });
    const result = await uploadSiteMedia({
      file,
      alt: input.alt,
      tagsRaw: input.tags,
      uploadedBy: admin.userId,
    });
    if (!result.ok) return safeFail("UPLOAD_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: result.id,
      targetLabel: input.fileName,
      action: "updated",
      reason: "Uploaded site media",
    });
    return safeOk({ id: result.id, path: result.path, url: result.url });
  },
});

export const updateSiteMediaMetaAction = safeAction({
  input: z.object({
    id: z.string().uuid(),
    alt: z.string().trim().min(1).max(300),
    tags: z.string().max(500).optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await updateSiteMediaMeta({
      id: input.id,
      alt: input.alt,
      tags: input.tags != null ? parseTags(input.tags) : undefined,
    });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "updated",
      reason: "Updated site media metadata",
    });
    return safeOk({});
  },
});
