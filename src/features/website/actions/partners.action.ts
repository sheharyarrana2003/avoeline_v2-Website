"use server";

import { z } from "zod";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { deletePartner, setPartnerConsent, upsertPartner } from "../partnersCms.service";

export const upsertPartnerAction = safeAction({
  input: z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
    url: z.string().trim().max(500).nullable().optional(),
    category: z.string().trim().max(80).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    logo_media_id: z.string().uuid().nullable().optional(),
    featured: z.boolean().optional(),
    visible: z.boolean().optional(),
    sort: z.number().int().min(0).max(10_000).optional(),
    consent_status: z.enum(["pending", "granted", "revoked"]).optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await upsertPartner({
      id: input.id,
      name: input.name,
      url: input.url ?? null,
      category: input.category ?? null,
      description: input.description ?? null,
      logo_media_id: input.logo_media_id ?? null,
      featured: input.featured,
      visible: input.visible,
      sort: input.sort,
      consent_status: input.consent_status,
    });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: result.id,
      targetLabel: input.name,
      action: "updated",
      reason: "Upserted site partner",
    });
    return safeOk({ id: result.id });
  },
});

export const setPartnerConsentAction = safeAction({
  input: z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "granted", "revoked"]),
    visible: z.boolean().optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await setPartnerConsent(input);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "updated",
      reason: `Partner consent → ${input.status}`,
    });
    return safeOk({});
  },
});

export const deletePartnerAction = safeAction({
  input: z.object({ id: z.string().uuid() }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await deletePartner(input.id);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "removed",
      reason: "Deleted site partner",
    });
    return safeOk({});
  },
});
