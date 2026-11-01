"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { randomUUID } from "crypto";
import { AuthService } from "@/src/features/auth/authService";
import {
  selectFreePlan,
  submitPaidPlanScreenshot,
  type PlanAudience,
} from "@/src/features/onboarding/onboarding.service";
import { PAYMENT_SCREENSHOTS_BUCKET, supabaseAdmin } from "@/data/supabase";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import { safeAction, safeFail, toLegacyResult } from "@/src/lib/safeAction";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const EXT_FOR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_BYTES = 8 * 1024 * 1024;

const audienceSchema = z.enum(["organizer", "vendor"]);
const planKeySchema = z.string().trim().min(1).max(64);

async function requireAudienceUser(audience: PlanAudience) {
  const user = await AuthService.getCurrentUser();
  if (!user) return null;
  if (String(user.userType).toLowerCase() !== audience) return null;
  const verified = await AuthService.getEmailVerificationStatus();
  if (!verified.verified) return null;
  return user;
}

function resolveUploadMime(file: File): string | null {
  const declared = (file.type || "").toLowerCase().trim();
  if (ALLOWED_MIME.has(declared)) return declared;
  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
  };
  const guessed = byExt[ext];
  return guessed && ALLOWED_MIME.has(guessed) ? guessed : null;
}

const selectFreeInner = safeAction({
  input: z.object({
    audience: audienceSchema,
    planKey: planKeySchema,
  }),
  run: async ({ audience, planKey }) => {
    const user = await requireAudienceUser(audience);
    if (!user) return safeFail("UNAUTHORIZED", "Verify your email and stay signed in.");
    const limited = rateLimit(`onboard:free:${user.userId}`, 10, 300);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many attempts. Try again shortly.");
    const result = await selectFreePlan({ userId: user.userId, audience, planKey });
    if (!result.ok) return safeFail("FAILED", result.error);
    // Free self-serve stays pending review (organizer review_status / vendor status).
    redirect("/auth/signup/awaiting-approval");
  },
});

export async function selectFreePlanAction(
  audience: PlanAudience,
  planKey: string,
): Promise<{ success: boolean; error?: string } | void> {
  const result = await selectFreeInner({ audience, planKey });
  if (result.ok) return { success: true };
  return toLegacyResult(result);
}

export async function submitPaidPlanAction(
  audience: PlanAudience,
  planKey: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string } | void> {
  const audienceParsed = audienceSchema.safeParse(audience);
  const planParsed = planKeySchema.safeParse(planKey);
  if (!audienceParsed.success || !planParsed.success) {
    return { success: false, error: "Invalid plan selection." };
  }

  const user = await requireAudienceUser(audienceParsed.data);
  if (!user) return { success: false, error: "Verify your email and stay signed in." };
  const limited = rateLimit(`onboard:paid:${user.userId}`, 8, 600);
  if (!limited.ok) return { success: false, error: "Too many uploads. Try again shortly." };

  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size <= 0) {
    return { success: false, error: "Upload a payment screenshot." };
  }
  if (file.size > MAX_BYTES) return { success: false, error: "File must be 8MB or smaller." };

  const mime = resolveUploadMime(file);
  if (!mime) {
    return { success: false, error: "Upload a JPEG, PNG, WebP, or PDF only." };
  }

  const ext = EXT_FOR_MIME[mime] || "bin";
  const path = `subscription/${user.userId}/${randomUUID()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(PAYMENT_SCREENSHOTS_BUCKET)
    .upload(path, file, { contentType: mime, upsert: false });
  if (upErr) {
    logger.error("[submitPaidPlanAction] upload", { err: upErr.message });
    return { success: false, error: "Could not upload the screenshot." };
  }

  const result = await submitPaidPlanScreenshot({
    userId: user.userId,
    audience: audienceParsed.data,
    planKey: planParsed.data,
    screenshotPath: path,
  });
  if (!result.ok) return { success: false, error: result.error };
  redirect("/auth/signup/awaiting-approval");
}
