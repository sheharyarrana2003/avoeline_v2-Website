"use server";

import { z } from "zod";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import {
  deleteFaq,
  deleteTestimonial,
  updateContactMessage,
  upsertFaq,
  upsertTestimonial,
} from "../contentCms.service";

export const upsertFaqAction = safeAction({
  input: z.object({
    id: z.string().uuid().optional(),
    scope: z.string().trim().min(1).max(40).default("general"),
    question: z.string().trim().min(1).max(300),
    answer_md: z.string().max(20_000),
    sort: z.number().int().min(0).max(10_000).optional(),
    visible: z.boolean().optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await upsertFaq(input);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: result.id,
      targetLabel: input.question.slice(0, 80),
      action: "updated",
      reason: "Upserted FAQ",
    });
    return safeOk({ id: result.id });
  },
});

export const deleteFaqAction = safeAction({
  input: z.object({ id: z.string().uuid() }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await deleteFaq(input.id);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "removed",
      reason: "Deleted FAQ",
    });
    return safeOk({});
  },
});

export const upsertTestimonialAction = safeAction({
  input: z.object({
    id: z.string().uuid().optional(),
    quote: z.string().trim().min(1).max(2000),
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().max(120).nullable().optional(),
    organization: z.string().trim().max(120).nullable().optional(),
    avatar_media_id: z.string().uuid().nullable().optional(),
    consent_confirmed: z.boolean(),
    visible: z.boolean().optional(),
    sort: z.number().int().min(0).max(10_000).optional(),
  }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await upsertTestimonial(input);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: result.id,
      targetLabel: input.name,
      action: "updated",
      reason: "Upserted testimonial",
    });
    return safeOk({ id: result.id });
  },
});

export const deleteTestimonialAction = safeAction({
  input: z.object({ id: z.string().uuid() }),
  auth: () => requireWebsiteCap("website:edit"),
  async run(input, admin) {
    const result = await deleteTestimonial(input.id);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "removed",
      reason: "Deleted testimonial",
    });
    return safeOk({});
  },
});

export const updateContactMessageAction = safeAction({
  input: z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "in_progress", "done"]).optional(),
    notes: z.string().max(5000).nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
  }),
  auth: () => requireWebsiteCap("contact:manage"),
  async run(input, admin) {
    const result = await updateContactMessage(input);
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    await logModeration({
      admin,
      targetType: "website",
      targetId: input.id,
      targetLabel: input.id,
      action: "updated",
      reason: "Updated contact inbox message",
    });
    return safeOk({});
  },
});
