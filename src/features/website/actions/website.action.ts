"use server";

import { z } from "zod";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import type { Json } from "@/src/lib/database.types";
import { isBlockType, parseBlockDraft } from "../blocks/schemas";
import { sanitizeDraftPayload } from "../blockSanitize";
import {
  createBlock,
  deleteBlock,
  publishPage,
  reorderBlocks,
  restorePageRevision,
  saveDraftBlock,
  updatePageSeo,
} from "../siteContent.service";

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

export const saveDraftBlockAction = safeAction({
  input: z.object({
    blockId: z.string().uuid(),
    draft: jsonValue,
    visible: z.boolean().optional(),
    sort: z.number().int().min(0).max(10_000).optional(),
    type: z.string().trim().min(1).max(64).optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const type = input.type ?? "hero";
    const sanitized = sanitizeDraftPayload(type, input.draft);
    if (!sanitized.ok) return safeFail("VALIDATION", sanitized.error);

    const result = await saveDraftBlock({
      blockId: input.blockId,
      draft: sanitized.draft,
      visible: input.visible,
      sort: input.sort,
      type: input.type,
    });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);

    await logModeration({
      admin,
      targetType: "website",
      targetId: result.blockId,
      targetLabel: `block ${result.blockId}`,
      action: "updated",
      reason: "Saved website block draft",
      extra: { pageId: result.pageId },
    });
    return safeOk({ blockId: result.blockId, pageId: result.pageId });
  },
});

export const publishPageAction = safeAction({
  input: z.object({ pageId: z.string().uuid() }),
  auth: () => requireWebsiteCap("website:publish"),
  async run(input, admin) {
    const result = await publishPage({
      pageId: input.pageId,
      adminId: admin.userId,
    });
    if (!result.ok) return safeFail("PUBLISH_FAILED", result.error);

    await logModeration({
      admin,
      targetType: "website",
      targetId: result.pageId,
      targetLabel: result.slug,
      action: "published",
      reason: "Published website page",
      extra: { slug: result.slug },
    });
    return safeOk({ pageId: result.pageId, slug: result.slug });
  },
});

export const createBlockAction = safeAction({
  input: z.object({
    pageId: z.string().uuid(),
    type: z.string().trim().min(1).max(64),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    if (!isBlockType(input.type)) return safeFail("VALIDATION", "Unknown block type");
    const empty = parseBlockDraft(input.type, {});
    const draft = empty.ok ? (empty.data as Json) : {};
    const result = await createBlock({ pageId: input.pageId, type: input.type, draft });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: result.blockId,
      targetLabel: `new ${input.type}`,
      action: "updated",
      reason: "Created website block",
      extra: { pageId: input.pageId },
    });
    return safeOk({ blockId: result.blockId });
  },
});

export const deleteBlockAction = safeAction({
  input: z.object({ blockId: z.string().uuid() }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await deleteBlock(input.blockId);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.blockId,
      targetLabel: input.blockId,
      action: "removed",
      reason: "Deleted website block",
      extra: { pageId: result.pageId },
    });
    return safeOk({ pageId: result.pageId });
  },
});

export const reorderBlocksAction = safeAction({
  input: z.object({
    pageId: z.string().uuid(),
    orderedIds: z.array(z.string().uuid()).min(1).max(200),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await reorderBlocks(input.pageId, input.orderedIds);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.pageId,
      targetLabel: input.pageId,
      action: "updated",
      reason: "Reordered website blocks",
    });
    return safeOk({});
  },
});

export const restorePageRevisionAction = safeAction({
  input: z.object({
    pageId: z.string().uuid(),
    revisionId: z.string().uuid(),
  }),
  auth: () => requireWebsiteCap("website:publish"),
  async run(input, admin) {
    const result = await restorePageRevision({
      pageId: input.pageId,
      revisionId: input.revisionId,
      adminId: admin.userId,
    });
    if (!result.ok) return safeFail("RESTORE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.pageId,
      targetLabel: input.revisionId,
      action: "updated",
      reason: "Restored website page revision into drafts",
      extra: { revisionId: input.revisionId },
    });
    return safeOk({});
  },
});

export const updatePageSeoAction = safeAction({
  input: z.object({
    pageId: z.string().uuid(),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(320).optional(),
    ogImage: z.string().trim().max(500).optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const seo = {
      title: input.title ?? "",
      description: input.description ?? "",
      ogImage: input.ogImage ?? "",
    };
    const result = await updatePageSeo({
      pageId: input.pageId,
      seo,
      adminId: admin.userId,
    });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.pageId,
      targetLabel: input.pageId,
      action: "updated",
      reason: "Updated page SEO",
    });
    return safeOk({});
  },
});
