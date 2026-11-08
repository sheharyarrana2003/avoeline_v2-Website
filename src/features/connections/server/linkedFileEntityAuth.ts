import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { assertEventActor } from "@/src/features/events/ownership";
import { isClubPresident, resolveClub } from "@/src/features/clubs/club.service";
import type { LinkedFileEntityType } from "../types";

/**
 * Fail-closed ownership check before linking/listing Drive files for an entity.
 */
export async function assertLinkedFileEntityAccess(opts: {
  actorId: string;
  entityType: LinkedFileEntityType;
  entityId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { actorId, entityType, entityId } = opts;

  if (entityType === "event") {
    // Organizer Library scratch bucket uses entityId === actorId (not a real event id).
    if (entityId === actorId) return { ok: true };
    const event = await assertEventActor(entityId, "files");
    if (!event) return { ok: false, error: "You cannot manage files for that event." };
    return { ok: true };
  }

  if (entityType === "team") {
    const { data: team } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select("id, organizer_id, org_id, created_by")
      .eq("id", entityId)
      .maybeSingle();
    if (!team) return { ok: false, error: "Team not found." };
    const organizerId = String(team.organizer_id || team.created_by || "");
    if (organizerId && organizerId === actorId) return { ok: true };
    if (team.org_id) {
      const club = await resolveClub(String(team.org_id)).catch(() => null);
      const user = await AuthService.getCurrentUser().catch(() => null);
      if (club && user && isClubPresident(user, club)) return { ok: true };
    }
    // Staff may manage via event actor when team is event-scoped — already covered if organizer.
    return { ok: false, error: "You cannot manage files for that team." };
  }

  if (entityType === "club") {
    const club = await resolveClub(entityId).catch(() => null);
    if (!club) return { ok: false, error: "Club not found." };
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user || user.userId !== actorId) {
      return { ok: false, error: "Sign in required." };
    }
    if (!isClubPresident(user, club)) {
      return { ok: false, error: "Only this club's president can manage club files." };
    }
    return { ok: true };
  }

  if (entityType === "booking") {
    const { data: booking } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("id, organizer_id, vendor_id")
      .eq("id", entityId)
      .maybeSingle();
    if (!booking) return { ok: false, error: "Booking not found." };
    if (String(booking.organizer_id) === actorId || String(booking.vendor_id) === actorId) {
      return { ok: true };
    }
    return { ok: false, error: "You cannot manage files for that booking." };
  }

  return { ok: false, error: "Unknown entity type." };
}
