"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import {
  ensureTemplateForEvent,
  publishTemplate,
  rebindCertificatesToLatestTemplate,
  saveTemplateDraft,
} from "@/src/features/certificates/certificates.service";
import { GALLERY_SEEDS } from "@/src/features/certificates/gallerySeeds";
import {
  defaultLayout,
  type CertificateLayout,
  type TemplateAssets,
} from "@/src/features/certificates/layout.types";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const layoutSchema = z.custom<CertificateLayout>((v) => {
  return !!v && typeof v === "object" && Array.isArray((v as CertificateLayout).elements);
});

async function gate(eventId: string) {
  const event = await assertOwnedEvent(eventId);
  if (!event)
    return safeFail("FORBIDDEN", "You cannot edit that event's certificate template.") as never;
  const allowed = await hasModuleAccess(event.organizerId, "certificates");
  if (!allowed)
    return safeFail("MODULE", "Certificates module is not enabled for this organizer.") as never;
  return event;
}

function revalidateTemplate(organizerId: string, eventId: string) {
  revalidatePath(`/organizer/${organizerId}/events/${eventId}/certificates`);
  revalidatePath(`/organizer/${organizerId}/events/${eventId}/certificates/making-template`);
}

export const saveDraftAction = safeAction({
  input: z.object({
    eventId: z.string().min(1),
    name: z.string().optional(),
    layout: layoutSchema,
    assets: z.record(z.string(), z.string()).optional(),
    emailAttachPdf: z.boolean().optional(),
  }),
  run: async (input) => {
    const event = await gate(input.eventId);
    const tpl = await saveTemplateDraft({
      eventId: input.eventId,
      organizerId: event.organizerId,
      name: input.name,
      layout: input.layout,
      assets: input.assets as TemplateAssets | undefined,
      emailAttachPdf: input.emailAttachPdf,
    });
    revalidateTemplate(event.organizerId, input.eventId);
    return safeOk(tpl);
  },
});

export const publishTemplateAction = safeAction({
  input: z.object({ eventId: z.string().min(1) }),
  run: async (input) => {
    const limited = rateLimit(`cert:publish:${input.eventId}`, 20, 60);
    if (!limited.ok)
      return safeFail(
        "RATE_LIMIT",
        `Too many publish requests. Retry in ${limited.retryAfterSec}s.`,
      );
    const event = await gate(input.eventId);
    const tpl = await publishTemplate(input.eventId, event.organizerId);
    revalidateTemplate(event.organizerId, input.eventId);
    return safeOk(tpl);
  },
});

export const applyGallerySeedAction = safeAction({
  input: z.object({
    eventId: z.string().min(1),
    seedId: z.string().min(1),
  }),
  run: async (input) => {
    const event = await gate(input.eventId);
    const seed = GALLERY_SEEDS.find((s) => s.id === input.seedId);
    if (!seed) return safeFail("VALIDATION", "Unknown gallery design.");
    await ensureTemplateForEvent(input.eventId, event.organizerId);
    const tpl = await saveTemplateDraft({
      eventId: input.eventId,
      organizerId: event.organizerId,
      name: seed.name,
      layout: seed.layout ?? defaultLayout(),
    });
    revalidateTemplate(event.organizerId, input.eventId);
    return safeOk(tpl);
  },
});

export const setEmailAttachPdfAction = safeAction({
  input: z.object({
    eventId: z.string().min(1),
    emailAttachPdf: z.boolean(),
  }),
  run: async (input) => {
    const event = await gate(input.eventId);
    const existing = await ensureTemplateForEvent(input.eventId, event.organizerId);
    const tpl = await saveTemplateDraft({
      eventId: input.eventId,
      organizerId: event.organizerId,
      layout: existing.layout,
      assets: existing.assets,
      emailAttachPdf: input.emailAttachPdf,
      name: existing.name,
      keepStatus: true,
    });
    revalidateTemplate(event.organizerId, input.eventId);
    return safeOk(tpl);
  },
});

export const reRenderAllWithLatestAction = safeAction({
  input: z.object({ eventId: z.string().min(1) }),
  run: async (input) => {
    const limited = rateLimit(`cert:rebind:${input.eventId}`, 5, 60);
    if (!limited.ok)
      return safeFail(
        "RATE_LIMIT",
        `Too many re-render requests. Retry in ${limited.retryAfterSec}s.`,
      );
    const event = await gate(input.eventId);
    const count = await rebindCertificatesToLatestTemplate(input.eventId);
    revalidateTemplate(event.organizerId, input.eventId);
    return safeOk({ updated: count });
  },
});
