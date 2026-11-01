"use server";

import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { requireCompeteRegistration } from "../competeSession";
import { getEffectiveConfig } from "../tasks.service";
import { listTeamsOfEvent } from "../hackathon.service";
import { patchHackathonTeam } from "../teamWrite";

export const reportActivityPing = safeAction({
  input: z.object({ eventId: z.string().uuid() }),
  run: async (input) => {
    const session = await requireCompeteRegistration(input.eventId);
    if (!session) return safeFail("AUTH", "Session expired.");
    const limited = rateLimit(`ping:${session.teamId}`, 6, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Slow down.");

    const teams = await listTeamsOfEvent(input.eventId);
    const team = teams.find((t) => t.id === session.teamId);
    if (!team) return safeFail("NOT_FOUND", "Team not found.");
    const cfg = await getEffectiveConfig(team.trackId);
    if (!cfg.on("team_attendance") && !cfg.on("activity_check_interval")) {
      return safeOk({ recorded: false });
    }

    await supabaseAdmin.from(TABLES.TEAM_ACTIVITY_PINGS).insert({
      event_id: input.eventId,
      team_id: session.teamId,
      registration_id: session.registration.registrationId,
    } as never);
    return safeOk({ recorded: true });
  },
});

export const reportIntegrityEvent = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    eventType: z.enum(["visibility_hidden", "visibility_visible", "tab_blur"]),
  }),
  run: async (input) => {
    const session = await requireCompeteRegistration(input.eventId);
    if (!session) return safeFail("AUTH", "Session expired.");
    const limited = rateLimit(`integrity:${session.teamId}`, 30, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Slow down.");

    const teams = await listTeamsOfEvent(input.eventId);
    const team = teams.find((t) => t.id === session.teamId);
    if (!team) return safeFail("NOT_FOUND", "Team not found.");
    const cfg = await getEffectiveConfig(team.trackId);
    if (!cfg.on("anti_cheat_tab_close")) return safeOk({ recorded: false });

    await supabaseAdmin.from(TABLES.TEAM_INTEGRITY_EVENTS).insert({
      event_id: input.eventId,
      team_id: session.teamId,
      registration_id: session.registration.registrationId,
      event_type: input.eventType,
      flagged: true,
    } as never);
    return safeOk({ recorded: true });
  },
});

export const acknowledgeCompetitionRules = safeAction({
  input: z.object({ eventId: z.string().uuid() }),
  run: async (input) => {
    const session = await requireCompeteRegistration(input.eventId);
    if (!session) return safeFail("AUTH", "Session expired.");
    const teams = await listTeamsOfEvent(input.eventId);
    const team = teams.find((t) => t.id === session.teamId);
    if (!team) return safeFail("NOT_FOUND", "Team not found.");
    await patchHackathonTeam(team.id, { rulesAcknowledgedAt: new Date().toISOString() });
    return safeOk({ ok: true });
  },
});
