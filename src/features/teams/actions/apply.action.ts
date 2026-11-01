"use server";

import { z } from "zod";
import { safeAction } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { looksLikeEmail, normalizeEmail } from "@/src/features/access/types";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";

const applySchema = z.object({
  token: z.string().min(16).max(128),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  website: z.string().optional(), // honeypot
  answers: z.record(z.string(), z.unknown()).optional(),
});

export const applyByTokenAction = safeAction({
  input: applySchema,
  async run(input) {
    if (input.website && String(input.website).trim()) {
      // Honeypot filled — pretend success.
      return { submitted: true as const };
    }
    const rl = rateLimit(`apply:${input.token}:${normalizeEmail(input.email)}`, 5, 3600);
    if (!rl.ok) throw new Error("Too many applications. Try again later.");

    const form = await TeamEngineService.getRecruitmentFormByToken(input.token);
    if (!form || !form.isOpen) throw new Error("This application form is not open.");

    const email = normalizeEmail(input.email);
    if (!looksLikeEmail(email)) throw new Error("A valid email is required.");

    const responses: Record<string, unknown> = { ...(input.answers || {}) };
    for (const field of form.fields) {
      const value = responses[field.key];
      if (
        field.required &&
        (value === undefined || value === null || String(value).trim() === "")
      ) {
        throw new Error(`${field.label} is required.`);
      }
    }

    await TeamEngineService.addApplicant({
      teamId: form.teamId,
      formId: form.id,
      email,
      name: input.name.trim(),
      positionId: form.positionId,
      responses,
    });
    return { submitted: true as const };
  },
});
