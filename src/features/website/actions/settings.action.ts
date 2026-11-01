"use server";

import { z } from "zod";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import type { Json } from "@/src/lib/database.types";
import { parseHighlightFeatures } from "../cms.logic";
import { updatePlanDisplay, updateStatsSetting, upsertSiteSetting } from "../settingsCms.service";

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

export const upsertSiteSettingAction = safeAction({
  input: z.object({
    key: z.enum(["nav", "footer", "social", "contact", "announcement", "seo_defaults", "stats"]),
    value: jsonValue,
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await upsertSiteSetting(input.key, input.value as Json, admin.userId);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.key,
      targetLabel: input.key,
      action: "updated",
      reason: `Updated site setting ${input.key}`,
    });
    return safeOk({});
  },
});

export const updatePlanDisplayAction = safeAction({
  input: z.object({
    id: z.string().uuid(),
    is_public: z.boolean().optional(),
    is_recommended: z.boolean().optional(),
    badge_text: z.string().trim().max(80).nullable().optional(),
    tagline: z.string().trim().max(200).nullable().optional(),
    highlight_features_text: z.string().max(2000).optional(),
    cta_label: z.string().trim().max(80).nullable().optional(),
    cta_href: z.string().trim().max(300).nullable().optional(),
    sort_order: z.number().int().min(0).max(10_000).optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await updatePlanDisplay({
      id: input.id,
      is_public: input.is_public,
      is_recommended: input.is_recommended,
      badge_text: input.badge_text,
      tagline: input.tagline,
      highlight_features:
        input.highlight_features_text != null
          ? parseHighlightFeatures(input.highlight_features_text)
          : undefined,
      cta_label: input.cta_label,
      cta_href: input.cta_href,
      sort_order: input.sort_order,
    });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "updated",
      reason: "Updated plan display flags/copy",
    });
    return safeOk({});
  },
});

export const updateStatsSettingAction = safeAction({
  input: z.object({
    key: z.string().trim().min(1).max(64),
    label: z.string().trim().min(1).max(80),
    visible: z.boolean(),
    min_threshold: z.number().int().min(0).max(1_000_000_000),
    format: z.enum(["number", "compact"]),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await updateStatsSetting(input);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.key,
      targetLabel: input.key,
      action: "updated",
      reason: "Updated stats display setting",
    });
    return safeOk({});
  },
});
