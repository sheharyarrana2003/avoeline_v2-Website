"use server";

import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { PAYMENT_SCREENSHOTS_BUCKET, supabaseAdmin } from "@/data/supabase";
import { getPublicEvent, isPaidEvent } from "../registration.service";
import { headers } from "next/headers";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";

function safeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "file"
  );
}

/**
 * Anonymous OK when the event is open for registration.
 * Returns a signed upload URL into `payment-screenshots` under `registration/{eventId}/…`.
 */
export const requestRegistrationUpload = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(3).max(120),
  }),
  run: async (input) => {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const limited = rateLimit(`reg-upload:${input.eventId}:${ip}`, 20, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", "Too many uploads. Try again shortly.");
    }

    const event = await getPublicEvent(input.eventId);
    if (!event) return safeFail("CLOSED", "This event is not open for registration.");
    if (event.requiresRegistration === false) {
      return safeFail("CLOSED", "This event does not take registrations.");
    }
    if (!isActiveLifecycle(eventLifecycle(event.status, event.schedule))) {
      return safeFail("CLOSED", "This event is not open for registration.");
    }

    const mime = input.contentType.toLowerCase();
    const allowImage = mime.startsWith("image/");
    const allowPdf = mime === "application/pdf";
    if (!allowImage && !allowPdf) {
      return safeFail("VALIDATION", "Upload an image or PDF.");
    }

    // Paid events primarily use images for payment proof; still allow PDF for other file fields.
    void isPaidEvent;

    const path = `registration/${input.eventId}/${crypto.randomUUID()}-${safeName(input.fileName)}`;
    const { data, error } = await supabaseAdmin.storage
      .from(PAYMENT_SCREENSHOTS_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("[requestRegistrationUpload]", error);
      return safeFail("UPLOAD", "Could not prepare the upload.");
    }

    return safeOk({
      path,
      bucket: PAYMENT_SCREENSHOTS_BUCKET,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  },
});

/** Confirm an uploaded object exists before accepting it on register. */
export async function registrationUploadExists(path: string): Promise<boolean> {
  if (!path) return false;
  // O1 FileStore / legacy Drive refs.
  if (path.startsWith("file:") && path.length > 10) return true;
  if (path.startsWith("/api/files/") && path.length > 12) return true;
  if (path.startsWith("drive:") && path.length > 10) return true;
  if (path.includes("drive.google.com/") && path.length > 20) return true;
  // Legacy Supabase payment-screenshots path.
  if (!path.startsWith("registration/")) return false;
  const { data, error } = await supabaseAdmin.storage
    .from(PAYMENT_SCREENSHOTS_BUCKET)
    .createSignedUrl(path, 30);
  return !error && !!data?.signedUrl;
}
