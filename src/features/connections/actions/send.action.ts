"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import {
  cancelBatchRest,
  changeBatchStartTime,
  enqueueBatch,
  listBatches,
  previewSend,
  type ResolvedRecipient,
} from "@/src/features/connections/server/batch.service";
import { getCapacity } from "@/src/features/connections/server/capacity.service";
import { findActiveEmailConnection } from "@/src/features/connections/server/connections.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk, type SafeActionResult } from "@/src/lib/safeAction";

type ConfirmSendData = { cancelled: true } | { batchId: string; sentNow: number; queued: number };

async function assertSelfOrOwner(ownerId: string) {
  const user = await AuthService.getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  const isSelf = user.userId === ownerId;
  const admin = await AuthService.requireAdmin("organizers");
  if (!isSelf && !admin?.isOwner) return { ok: false as const, error: "Forbidden." };
  return { ok: true as const, user };
}

const recipientSchema = z.object({
  email: z.string().email(),
  registrationId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  name: z.string().max(200).nullable().optional(),
});

export const getCapacityAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    kind: z.string().min(1).max(80).default("custom"),
    eventId: z.string().uuid().optional(),
    connectionId: z.string().uuid().optional(),
  }),
  run: async (input) => {
    const gate = await assertSelfOrOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const conn = input.connectionId
      ? input.connectionId
      : (await findActiveEmailConnection({ ownerType: "user", ownerId: input.ownerId }))?.id;
    if (!conn) return safeFail("NO_CONNECTION", "Connect Google first.");
    const capacity = await getCapacity({
      connection: conn,
      ownerId: input.ownerId,
      kind: input.kind,
      eventId: input.eventId,
    });
    return safeOk(capacity);
  },
});

export const previewSendAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    kind: z.string().min(1).max(80),
    eventId: z.string().uuid().optional(),
    connectionId: z.string().uuid().optional(),
    recipients: z.array(recipientSchema).min(1).max(5000),
    startAt: z.string().datetime().optional(),
  }),
  run: async (input) => {
    const gate = await assertSelfOrOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const limited = rateLimit(`connections:preview:${input.ownerId}`, 30, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many previews. Retry in ${limited.retryAfterSec}s.`);
    }
    const result = await previewSend({
      ownerId: input.ownerId,
      kind: input.kind,
      recipients: input.recipients as ResolvedRecipient[],
      connectionId: input.connectionId,
      eventId: input.eventId,
      startAt: input.startAt ? new Date(input.startAt) : undefined,
    });
    return safeOk(result);
  },
});

export const confirmSendAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    kind: z.string().min(1).max(80),
    subject: z.string().min(1).max(500),
    html: z.string().max(200_000).optional(),
    text: z.string().max(100_000).optional(),
    eventId: z.string().uuid().optional(),
    connectionId: z.string().uuid().optional(),
    recipients: z.array(recipientSchema).min(1).max(5000),
    mode: z.enum(["send_and_schedule", "selection_cap", "spread_days", "cancel"]),
    spreadDays: z.number().int().min(1).max(30).optional(),
    startAt: z.string().datetime().optional(),
  }),
  run: async (input): Promise<SafeActionResult<ConfirmSendData>> => {
    const gate = await assertSelfOrOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    if (input.mode === "cancel") return safeOk({ cancelled: true });

    const limited = rateLimit(`connections:send:${input.ownerId}`, 10, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many sends. Retry in ${limited.retryAfterSec}s.`);
    }

    const result = await enqueueBatch({
      ownerId: input.ownerId,
      kind: input.kind,
      subject: input.subject,
      html: input.html,
      text: input.text,
      recipients: input.recipients as ResolvedRecipient[],
      mode: input.mode,
      spreadDays: input.spreadDays,
      startAt: input.startAt ? new Date(input.startAt) : undefined,
      eventId: input.eventId,
      connectionId: input.connectionId,
      createdBy: gate.user.userId,
    });

    revalidatePath(`/organizer/${input.ownerId}/settings/email-batches`);
    revalidatePath(`/organizer/${input.ownerId}/settings/connections`);
    return safeOk(result);
  },
});

export const listBatchesAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    cursorCreatedAt: z.string().optional(),
    cursorId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  run: async (input) => {
    const gate = await assertSelfOrOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    const cursor =
      input.cursorCreatedAt && input.cursorId
        ? { createdAt: input.cursorCreatedAt, id: input.cursorId }
        : null;
    const page = await listBatches({ ownerId: input.ownerId, cursor, limit: input.limit });
    return safeOk(page);
  },
});

export const cancelBatchAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    batchId: z.string().uuid(),
  }),
  run: async (input) => {
    const gate = await assertSelfOrOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    await cancelBatchRest(input.batchId, gate.user.userId);
    revalidatePath(`/organizer/${input.ownerId}/settings/email-batches`);
    return safeOk({ cancelled: true });
  },
});

export const rescheduleBatchAction = safeAction({
  input: z.object({
    ownerId: z.string().uuid(),
    batchId: z.string().uuid(),
    notBefore: z.string().datetime(),
  }),
  run: async (input) => {
    const gate = await assertSelfOrOwner(input.ownerId);
    if (!gate.ok) return safeFail("FORBIDDEN", gate.error);
    await changeBatchStartTime(input.batchId, new Date(input.notBefore), gate.user.userId);
    revalidatePath(`/organizer/${input.ownerId}/settings/email-batches`);
    return safeOk({ rescheduled: true });
  },
});
