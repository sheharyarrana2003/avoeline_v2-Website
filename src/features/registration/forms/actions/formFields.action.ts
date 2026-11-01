"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { assertEventActor } from "@/src/features/events/ownership";
import { FORM_FIELD_TYPES, FORM_FIELD_SCOPES } from "../formFields.types";
import {
  archiveField,
  listActiveFields,
  listAllFields,
  reorderFields,
  syncPaymentField,
  upsertField,
} from "../formFields.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

async function requireAccess(eventId: string) {
  const event = await assertEventActor(eventId, "access");
  if (!event) return safeFail("FORBIDDEN", "You cannot edit this event's registration form.");
  return { event };
}

function revalidateAccess(organizerId: string, eventId: string) {
  revalidatePath(`/organizer/${organizerId}/events/${eventId}/access`);
  revalidatePath(`/events/${eventId}`);
}

export const listFormFieldsAction = safeAction({
  input: z.object({ eventId: z.string().uuid(), includeArchived: z.boolean().optional() }),
  auth: async () => undefined,
  run: async (input) => {
    const gate = await requireAccess(input.eventId);
    if ("ok" in gate && gate.ok === false) return gate;
    const fields = input.includeArchived
      ? await listAllFields(input.eventId)
      : await listActiveFields(input.eventId);
    return safeOk(fields);
  },
});

export const upsertFormFieldAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    id: z.string().uuid().optional(),
    key: z.string().min(1).max(64),
    label: z.string().min(1).max(200),
    type: z.enum(FORM_FIELD_TYPES),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    helpText: z.string().nullable().optional(),
    placeholder: z.string().nullable().optional(),
    scope: z.enum(FORM_FIELD_SCOPES).optional(),
    orderIndex: z.number().int().optional(),
  }),
  auth: async () => undefined,
  run: async (input) => {
    const gate = await requireAccess(input.eventId);
    if ("ok" in gate && gate.ok === false) return gate;
    const { event } = gate as { event: NonNullable<Awaited<ReturnType<typeof assertEventActor>>> };
    const field = await upsertField(input.eventId, input);
    revalidateAccess(event.organizerId, input.eventId);
    return safeOk(field);
  },
});

export const reorderFormFieldsAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    orderedIds: z.array(z.string().uuid()).min(1),
  }),
  auth: async () => undefined,
  run: async (input) => {
    const gate = await requireAccess(input.eventId);
    if ("ok" in gate && gate.ok === false) return gate;
    const { event } = gate as { event: NonNullable<Awaited<ReturnType<typeof assertEventActor>>> };
    await reorderFields(input.eventId, input.orderedIds);
    revalidateAccess(event.organizerId, input.eventId);
    return safeOk(undefined);
  },
});

export const archiveFormFieldAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    fieldId: z.string().uuid(),
  }),
  auth: async () => undefined,
  run: async (input) => {
    const gate = await requireAccess(input.eventId);
    if ("ok" in gate && gate.ok === false) return gate;
    const { event } = gate as { event: NonNullable<Awaited<ReturnType<typeof assertEventActor>>> };
    const result = await archiveField(input.eventId, input.fieldId);
    revalidateAccess(event.organizerId, input.eventId);
    return safeOk(result);
  },
});

export const updateGroupRegistrationAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    allowGroupRegistration: z.boolean(),
    groupMinSize: z.number().int().min(1).max(50).optional(),
    groupMaxSize: z.number().int().min(1).max(50).optional(),
  }),
  auth: async () => undefined,
  run: async (input) => {
    const gate = await requireAccess(input.eventId);
    if ("ok" in gate && gate.ok === false) return gate;
    const { event } = gate as { event: NonNullable<Awaited<ReturnType<typeof assertEventActor>>> };

    const min = input.groupMinSize ?? 2;
    const max = input.groupMaxSize ?? 8;
    if (input.allowGroupRegistration && max < min) {
      return safeFail("VALIDATION", "Max group size must be at least the minimum.");
    }

    const { error } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .update({
        allow_group_registration: input.allowGroupRegistration,
        group_min_size: input.allowGroupRegistration ? min : null,
        group_max_size: input.allowGroupRegistration ? max : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.eventId);
    if (error) return safeFail("DB", "Could not update group registration settings.");

    revalidateAccess(event.organizerId, input.eventId);
    return safeOk(undefined);
  },
});

export const syncPaymentFieldAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    isFree: z.boolean(),
  }),
  auth: async () => undefined,
  run: async (input) => {
    const gate = await requireAccess(input.eventId);
    if ("ok" in gate && gate.ok === false) return gate;
    const { event } = gate as { event: NonNullable<Awaited<ReturnType<typeof assertEventActor>>> };
    await syncPaymentField(input.eventId, input.isFree);
    revalidateAccess(event.organizerId, input.eventId);
    return safeOk(undefined);
  },
});
