"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { regStatusToDb } from "@/data/statusMaps";
import { assertEventActor } from "@/src/features/events/ownership";
import { approveDisabledReason } from "@/src/features/event_attendee/approveDisabledReason";
import {
  maybeAutoEventEmail,
  sendOrganizerEmail,
} from "@/src/features/event_attendee/eventEmail.service";
import { maybeRevealHackathonAccessCodes } from "@/src/features/hackathon/accessCodes.service";
import { isPaidEvent } from "@/src/features/registration/registration.service";
import { EventService } from "@/src/services/event.service";
import { RegService } from "@/src/services/registeration.service";
import { sendViaOrganizerConnection } from "@/src/features/email/organizerTransport.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const schema = z.object({
  eventId: z.string().uuid(),
  registrationIds: z.array(z.string().uuid()).min(1).max(200),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(2000).optional().default(""),
});

export const bulkDecideRegistrationsAction = safeAction({
  input: schema,
  auth: async () => ({ label: "bulkDecideRegistrations" }),
  run: async (input) => {
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "Not allowed.");
    const fullEvent = await EventService.getEventByID(input.eventId);
    if (!fullEvent) return safeFail("NOT_FOUND", "Event not found.");
    const paid = isPaidEvent(fullEvent);
    const regs = await RegService.getRegsOfEvent(input.eventId);
    const byId = new Map(regs.map((r) => [r.registrationId, r]));

    let approved = 0;
    let rejected = 0;
    let skipped = 0;

    for (const id of input.registrationIds) {
      const reg = byId.get(id);
      if (!reg) {
        skipped += 1;
        continue;
      }
      if (reg.status !== "pending" && reg.status !== "awaiting_payment") {
        skipped += 1;
        continue;
      }

      if (input.decision === "approve") {
        const block = approveDisabledReason({
          isPaid: paid,
          status: reg.status,
          proofPath: reg.payment?.proofPath,
          paymentStatus: reg.payment?.paymentStatus,
        });
        if (block) {
          skipped += 1;
          continue;
        }
        const now = new Date().toISOString();
        const history = [
          ...(reg.statusHistory || []),
          { status: "confirmed" as const, timestamp: now },
        ];
        const { error } = await supabaseAdmin
          .from(TABLES.REGISTRATIONS)
          .update({
            status: regStatusToDb("confirmed"),
            status_history: history,
            updated_at: now,
          })
          .eq("id", id);
        if (error) throw error;
        await maybeRevealHackathonAccessCodes(id);
        const updated = (await RegService.getRegsOfEvent(input.eventId)).find(
          (r) => r.registrationId === id,
        );
        if (updated?.attendee?.email) {
          await sendOrganizerEmail({
            registration: updated,
            event: fullEvent,
            kind: "registration_confirmed",
            skipIfSent: false,
          }).catch(() => null);
        }
        await maybeAutoEventEmail(id).catch(() => null);
        approved += 1;
      } else {
        const now = new Date().toISOString();
        const history = [
          ...(reg.statusHistory || []),
          { status: "rejected" as const, timestamp: now },
        ];
        const reason = String(input.reason || "").trim();
        const { error } = await supabaseAdmin
          .from(TABLES.REGISTRATIONS)
          .update({
            status: regStatusToDb("rejected"),
            status_history: history,
            updated_at: now,
          })
          .eq("id", id);
        if (error) throw error;
        const email = reg.attendee?.email;
        if (email) {
          const { renderRegistrationKindEmail } =
            await import("@/src/features/email/renderAttendeeEmail");
          const subject = `About your registration for ${fullEvent.title}`;
          const rendered = await renderRegistrationKindEmail({
            kind: "registration_rejected",
            registration: reg,
            event: fullEvent,
            subject,
            bodyPlain: reason
              ? `Your registration was not approved. Reason: ${reason}`
              : "Your registration was not approved by the organizer.",
            includeBlocks: [],
            rejectReason: reason || null,
          });
          await sendViaOrganizerConnection({
            organizerId: fullEvent.organizerId,
            to: email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            kind: "registration_rejected",
            eventId: input.eventId,
          }).catch(() => null);
        }
        rejected += 1;
      }
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/attendees`);
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}`);
    return safeOk({ approved, rejected, skipped });
  },
});
