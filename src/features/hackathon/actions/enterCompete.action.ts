"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { fail, type ActionResult, toLegacyResult } from "@/src/lib/action";
import { safeAction, safeFail } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { enterCompeteSchema } from "../compete.schema";
import { findCompeteLogin } from "../accessCodes.service";
import { teamsForRegistration } from "../hackathon.service";
import { clearCompeteCookie, setCompeteCookie } from "../competeSession";
import { getParticipantAccess } from "../participantAccess";

async function recordAccessFailure(eventId: string): Promise<void> {
  try {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
    await supabaseAdmin.from(TABLES.COMPETE_ACCESS_FAILURES).insert({
      event_id: eventId,
      ip_hash: ipHash,
    } as never);
  } catch {
    /* audit best-effort */
  }
}

const enterCompeteInner = safeAction({
  input: enterCompeteSchema,
  run: async (input) => {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const limited = rateLimit(`compete:${input.eventId}:${ip}`, 8, 60);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many attempts. Try again in ${limited.retryAfterSec}s.`);
    }

    // Progressive lockout after repeated failures from this IP for the event.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from(TABLES.COMPETE_ACCESS_FAILURES)
      .select("id", { count: "exact", head: true })
      .eq("event_id", input.eventId)
      .gte("created_at", since);
    if ((count ?? 0) >= 20) {
      return safeFail("RATE_LIMIT", "Too many failed attempts. Try again in 15 minutes.");
    }

    const found = await findCompeteLogin(input.eventId, input.code);
    if (!found) {
      await recordAccessFailure(input.eventId);
      return safeFail("INVALID_CODE", "That code is not valid, or it has not been released yet.");
    }

    const teams = await teamsForRegistration(found.registration.registrationId);
    const team = teams.find((t) => t.id === found.teamId) ?? teams[0];
    if (!team) {
      return safeFail("NO_TEAM", "You are not on a team yet. Ask the organizer to assign you.");
    }

    const access = await getParticipantAccess({
      eventId: input.eventId,
      registrationId: found.registration.registrationId,
      teamId: team.id,
    });
    if (!access.allowed) {
      return safeFail(access.reasonCode.toUpperCase(), access.message);
    }

    await setCompeteCookie({
      registrationId: found.registration.registrationId,
      eventId: input.eventId,
      teamId: team.id,
    });
    redirect(`/events/${input.eventId}/compete`);
  },
});

export async function enterCompeteAction(
  eventId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void _prev;
  try {
    const result = await enterCompeteInner({
      eventId,
      code: String(formData.get("code") ?? ""),
    });
    return toLegacyResult(result);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    logger.error("[enterCompeteAction]", { err: err instanceof Error ? err.message : "unknown" });
    return fail("Could not sign you in. Please try again.");
  }
}

export async function leaveCompeteAction(eventId: string): Promise<void> {
  await clearCompeteCookie(eventId);
  redirect(`/events/${eventId}/enter`);
}
