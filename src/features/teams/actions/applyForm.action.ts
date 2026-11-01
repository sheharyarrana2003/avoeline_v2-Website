"use server";

import { finishForm } from "@/src/lib/formRedirect";
import { ok, fail } from "@/src/lib/action";
import { rateLimit } from "@/src/lib/rateLimit";
import { looksLikeEmail, normalizeEmail } from "@/src/features/access/types";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";

export async function applyByTokenFormAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "").trim();
  const honeypot = String(formData.get("website") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(formData.get("email"));

  if (honeypot) {
    finishForm(formData, `/apply/${token}`, ok(), "Application submitted.");
    return;
  }

  const form = await TeamEngineService.getRecruitmentFormByToken(token);
  let result = ok();
  if (!form || !form.isOpen) result = fail("This application form is not open.");
  else if (!name) result = fail("Name is required.");
  else if (!looksLikeEmail(email)) result = fail("A valid email is required.");
  else {
    const rl = rateLimit(`apply-form:${token}:${email}`, 5, 3600);
    if (!rl.ok) result = fail("Too many applications. Try again later.");
    else {
      const responses: Record<string, unknown> = {};
      for (const field of form.fields) {
        const key = field.key;
        const multi = formData.getAll(`field_${key}[]`).map(String);
        if (multi.length) {
          responses[key] = multi;
          continue;
        }
        const value = String(formData.get(`field_${key}`) || "").trim();
        if (field.required && !value && field.type !== "checkbox" && field.type !== "checkboxes") {
          result = fail(`${field.label} is required.`);
          break;
        }
        responses[key] =
          field.type === "checkbox" || field.type === "checkboxes"
            ? formData.get(`field_${key}`) === "on" || multi
            : value;
      }
      if (result.success) {
        try {
          await TeamEngineService.addApplicant({
            teamId: form.teamId,
            formId: form.id,
            email,
            name,
            positionId: form.positionId,
            responses,
          });
        } catch (err) {
          result = fail(err instanceof Error ? err.message : "Could not submit the application.");
        }
      }
    }
  }
  finishForm(formData, `/apply/${token}`, result, "Application submitted.");
}
