/**
 * Batch occupancy tallies for organizer My Events — one regs query + batched teams/groups.
 * Do not use per-event round trips.
 */

import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { mapToTeam } from "@/src/features/hackathon/hackathon.service";
import { isHackathon } from "@/src/features/hackathon/hackathon.service";
import { hydrateRegistrationRow, mapToRegistration } from "@/src/services/registeration.service";
import type { EventModel } from "@/src/services/models/event.model";
import type { Registration } from "@/src/services/models/reg.type";
import {
  tallyOccupancy,
  type EventOccupancyTally,
  type OccupancyGroup,
  type OccupancyTeam,
} from "./organizerEvents.occupancy";

const TEAM_COLS =
  "id, event_id, track_id, name, member_registration_ids, extra, fee_status, join_code, created_at, updated_at";

function allowGroup(event: EventModel): boolean {
  return !!(
    event.registration?.groupRegistrationEnabled ||
    event.registration?.groupRegistration ||
    (event as { allowGroupRegistration?: boolean }).allowGroupRegistration
  );
}

async function loadRegsByOrganizer(organizerId: string): Promise<Registration[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("*")
    .eq("organizer_id", organizerId);
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapToRegistration(hydrateRegistrationRow(row as Record<string, unknown>), row.id),
  );
}

async function loadTeamsByEventIds(eventIds: string[]): Promise<Map<string, OccupancyTeam[]>> {
  const out = new Map<string, OccupancyTeam[]>();
  if (!eventIds.length) return out;

  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select(TEAM_COLS)
    .in("event_id", eventIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const team = mapToTeam(row, row.id);
    const eid = team.eventId;
    const list = out.get(eid) ?? [];
    list.push({
      members: team.members.map((m) => ({ registrationId: m.registrationId, isOwner: m.isOwner })),
    });
    out.set(eid, list);
  }
  return out;
}

async function loadGroupsByEventIds(eventIds: string[]): Promise<Map<string, OccupancyGroup[]>> {
  const out = new Map<string, OccupancyGroup[]>();
  if (!eventIds.length) return out;

  const { data: groups, error } = await supabaseAdmin
    .from(TABLES.REGISTRATION_GROUPS)
    .select("id, event_id, lead_registration_id")
    .in("event_id", eventIds);
  if (error) throw error;
  if (!groups?.length) return out;

  const groupIds = groups.map((g) => String(g.id));
  const { data: memberRows } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id, group_id")
    .in("group_id", groupIds);

  const membersByGroup = new Map<string, string[]>();
  for (const r of memberRows ?? []) {
    const gid = String(r.group_id || "");
    if (!gid) continue;
    const list = membersByGroup.get(gid) ?? [];
    list.push(String(r.id));
    membersByGroup.set(gid, list);
  }

  for (const g of groups) {
    const eid = String(g.event_id);
    const list = out.get(eid) ?? [];
    list.push({
      leadRegistrationId: g.lead_registration_id ? String(g.lead_registration_id) : null,
      memberIds: membersByGroup.get(String(g.id)) ?? [],
    });
    out.set(eid, list);
  }
  return out;
}

/**
 * Per-event occupancy / check-in / revenue for an organizer's events.
 * One registrations read + batched teams + batched groups.
 */
export const getOrganizerEventOccupancyTallies = cache(
  async (
    organizerId: string,
    events: EventModel[],
    hackathonEventIds?: Set<string>,
  ): Promise<Map<string, EventOccupancyTally>> => {
    const eventIds = events.map((e) => e.id).filter(Boolean);
    const empty = new Map<string, EventOccupancyTally>();
    for (const id of eventIds) {
      empty.set(id, { registrations: 0, checkedIn: 0, revenue: 0, people: 0 });
    }
    if (!eventIds.length) return empty;

    const hackIds = new Set(hackathonEventIds ?? []);
    const groupEventIds = events
      .filter((e) => allowGroup(e) && !isHackathon(e) && !hackIds.has(e.id))
      .map((e) => e.id);
    const teamEventIds = events.filter((e) => isHackathon(e) || hackIds.has(e.id)).map((e) => e.id);

    const [regs, teamsByEvent, groupsByEvent] = await Promise.all([
      loadRegsByOrganizer(organizerId),
      loadTeamsByEventIds(teamEventIds),
      loadGroupsByEventIds(groupEventIds),
    ]);

    const regsByEvent = new Map<string, Registration[]>();
    for (const r of regs) {
      if (!r.eventId) continue;
      const list = regsByEvent.get(r.eventId) ?? [];
      list.push(r);
      regsByEvent.set(r.eventId, list);
    }

    const tallies = new Map<string, EventOccupancyTally>();
    for (const event of events) {
      const eventRegs = regsByEvent.get(event.id) ?? [];
      const hack = isHackathon(event) || hackIds.has(event.id);
      tallies.set(
        event.id,
        tallyOccupancy({
          regs: eventRegs,
          isHackathon: hack,
          allowGroupRegistration: allowGroup(event),
          teams: teamsByEvent.get(event.id) ?? [],
          groups: groupsByEvent.get(event.id) ?? [],
        }),
      );
    }
    return tallies;
  },
);
