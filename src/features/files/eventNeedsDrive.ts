import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { assertOrganizerDriveAndGmail } from "@/src/features/connections/server/assertOrganizerDriveAndGmail";

export type EventFileNeeds = {
  needsDrive: boolean;
  reasons: string[];
};

/**
 * Drive is required only when the event collects files or archives certs (A6).
 */
export async function evaluateEventFileNeeds(eventId: string): Promise<EventFileNeeds> {
  const reasons: string[] = [];

  const [{ data: event }, { data: fields }, { count: certCount }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, pricing, registration, extra")
      .eq("id", eventId)
      .maybeSingle(),
    supabaseAdmin
      .from(TABLES.EVENT_FORM_FIELDS)
      .select("id, type, key, active")
      .eq("event_id", eventId)
      .eq("active", true),
    supabaseAdmin
      .from(TABLES.CERTIFICATES)
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  const pricing = (event?.pricing || {}) as { isPaid?: boolean; amount?: number };
  if (pricing.isPaid || Number(pricing.amount) > 0) {
    reasons.push("paid_registration");
  }

  for (const f of fields || []) {
    const type = String(f.type || "");
    const key = String(f.key || "");
    if (type === "file" || type === "image" || key === "payment_screenshot") {
      reasons.push("file_field");
      break;
    }
  }

  if ((certCount || 0) > 0) {
    reasons.push("certificates");
  }

  const extra = (event?.extra || {}) as {
    archiveCertificates?: boolean;
    certificateArchive?: boolean;
  };
  if (extra.archiveCertificates || extra.certificateArchive) {
    reasons.push("certificate_archive");
  }

  return { needsDrive: reasons.length > 0, reasons: [...new Set(reasons)] };
}

/** Soft publish gate: require Drive only when files/certs are needed. */
export async function assertDriveIfEventNeedsFiles(
  organizerId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const needs = await evaluateEventFileNeeds(eventId);
  if (!needs.needsDrive) return { ok: true };
  const gate = await assertOrganizerDriveAndGmail(organizerId);
  if (!gate.ok) {
    return {
      ok: false,
      error:
        "This event collects files or certificates. Connect Google Drive (and Gmail) in Connections before publishing.",
    };
  }
  return { ok: true };
}

/** Wizard/form-time estimate before an event id exists. */
export function formDataNeedsDrive(form: {
  PriceOfTicket?: number | string | null;
  isPaid?: boolean;
  customFields?: Array<{ type?: string; key?: string }>;
  formFields?: Array<{ type?: string; key?: string }>;
  archiveCertificates?: boolean;
}): boolean {
  if (form.isPaid || Number(form.PriceOfTicket) > 0) return true;
  if (form.archiveCertificates) return true;
  const fields = [...(form.customFields || []), ...(form.formFields || [])];
  return fields.some(
    (f) => f.type === "file" || f.type === "image" || f.key === "payment_screenshot",
  );
}
