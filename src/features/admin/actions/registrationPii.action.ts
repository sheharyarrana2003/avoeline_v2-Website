"use server";

import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { requireAdminArea } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { assertStaffPiiReason } from "@/src/features/website/consent.logic";
import { safeAction, safeFail, safeOk, type SafeActionResult } from "@/src/lib/safeAction";

async function requireSupportStaff() {
  const admin = await requireAdminArea("support");
  if (!admin)
    return safeFail("UNAUTHORIZED", "Please sign in as an admin.") as SafeActionResult<never>;
  return admin;
}

export const unlockRegistrationPiiAction = safeAction({
  input: z.object({
    registrationId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    reason: z.string().trim().min(1).max(500),
  }),
  auth: () => requireSupportStaff(),
  async run(input, admin) {
    const reasonGate = assertStaffPiiReason(input.reason);
    if (!reasonGate.ok) return safeFail("VALIDATION", reasonGate.error);

    if (!input.registrationId && !input.email) {
      return safeFail("VALIDATION", "Provide a registration id or email.");
    }

    let query = supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select(
        "id, event_id, attendee_name, attendee_email, attendee_phone, status, created_at, custom_responses, payment_proof_path",
      )
      .limit(20);

    if (input.registrationId) query = query.eq("id", input.registrationId);
    if (input.eventId) query = query.eq("event_id", input.eventId);
    if (input.email) query = query.ilike("attendee_email", input.email.trim());

    const { data, error } = await query;
    if (error) return safeFail("LOOKUP_FAILED", error.message);

    await logModeration({
      admin,
      targetType: "event",
      targetId: input.registrationId || input.eventId || "registration_search",
      targetLabel: input.email || input.registrationId || "registration_pii",
      action: "updated",
      reason: reasonGate.reason,
      extra: {
        kind: "registration_pii_access",
        reason: reasonGate.reason,
        eventId: input.eventId ?? null,
        resultCount: data?.length ?? 0,
      },
    });

    return safeOk({
      rows: (data ?? []).map((r) => ({
        id: r.id,
        eventId: r.event_id,
        name: r.attendee_name,
        email: r.attendee_email,
        phone: r.attendee_phone,
        status: r.status,
        createdAt: r.created_at,
        customResponses: r.custom_responses,
        paymentProofPath: r.payment_proof_path,
      })),
    });
  },
});
