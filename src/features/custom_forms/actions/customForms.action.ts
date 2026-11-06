"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import {
  createCustomForm,
  deleteCustomForm,
  getCustomFormForOwner,
  listCustomForms,
  listFormResponses,
  submitPublicFormResponse,
  updateCustomForm,
} from "../customForms.service";

const fieldSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  type: z.enum([
    "text",
    "long_text",
    "email",
    "number",
    "date",
    "dropdown",
    "radio",
    "checkboxes",
    "file",
    "image",
  ]),
  required: z.boolean().optional(),
  options: z.array(z.string().max(120)).max(40).optional(),
  askOnce: z.enum(["group", "member"]).optional(),
});

async function assertOwner(ownerId: string) {
  const user = await AuthService.getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  if (user.userId !== ownerId) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) return { ok: false as const, error: "Forbidden." };
  }
  return { ok: true as const, user };
}

export const listCustomFormsAction = safeAction({
  input: z.object({ ownerId: z.string().uuid() }),
  run: async ({ ownerId }) => {
    const gate = await assertOwner(ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const forms = await listCustomForms(ownerId);
    return safeOk({ forms });
  },
});

export const createCustomFormAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    kind: z.enum(["survey", "feedback", "checklist", "other"]).optional(),
  }),
  run: async (input) => {
    const gate = await assertOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const form = await createCustomForm({
      ownerUserId: input.ownerId,
      title: input.title,
      description: input.description,
      kind: input.kind,
    });
    revalidatePath(`/organizer/${input.ownerId}/forms`);
    return safeOk({ form });
  },
});

export const saveCustomFormAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    formId: z.string().uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    fields: z.array(fieldSchema).max(80).optional(),
    status: z.enum(["draft", "open", "closed"]).optional(),
    kind: z.enum(["survey", "feedback", "checklist", "other"]).optional(),
  }),
  run: async (input) => {
    const gate = await assertOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const form = await updateCustomForm({
      formId: input.formId,
      ownerUserId: input.ownerId,
      title: input.title,
      description: input.description,
      fields: input.fields?.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: Boolean(f.required),
        options: f.options,
        askOnce: f.askOnce,
      })),
      status: input.status,
      kind: input.kind,
    });
    if (!form) return safeFail("NOT_FOUND", "Form not found.");
    revalidatePath(`/organizer/${input.ownerId}/forms`);
    revalidatePath(`/organizer/${input.ownerId}/forms/${input.formId}`);
    return safeOk({ form });
  },
});

export const deleteCustomFormAction = safeAction({
  input: z.object({ ownerId: z.string().uuid(), formId: z.string().uuid() }),
  run: async (input) => {
    const gate = await assertOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    await deleteCustomForm(input.formId, input.ownerId);
    revalidatePath(`/organizer/${input.ownerId}/forms`);
    return safeOk({ deleted: true });
  },
});

export const listFormResponsesAction = safeAction({
  input: z.object({ ownerId: z.string().uuid(), formId: z.string().uuid() }),
  run: async (input) => {
    const gate = await assertOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const form = await getCustomFormForOwner(input.formId, input.ownerId);
    if (!form) return safeFail("NOT_FOUND", "Form not found.");
    const responses = await listFormResponses(input.formId, input.ownerId);
    return safeOk({ form, responses });
  },
});

export const submitPublicCustomFormAction = safeAction({
  input: z.object({
    token: z.string().min(8).max(80),
    respondentName: z.string().max(200).optional(),
    respondentEmail: z.string().email().max(320).optional().or(z.literal("")),
    answers: z.record(z.string().max(80), z.union([z.string().max(4000), z.number(), z.boolean()])),
  }),
  run: async (input) => {
    const limited = rateLimit(`custom-form:${input.token}`, 30, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many submissions. Try again shortly.");
    const r = await submitPublicFormResponse({
      token: input.token,
      respondentName: input.respondentName,
      respondentEmail: input.respondentEmail || undefined,
      answers: input.answers,
    });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    return safeOk({ submitted: true });
  },
});
