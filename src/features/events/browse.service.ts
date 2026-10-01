import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { UserService } from "@/src/services/user.service";
import { EventModel } from "@/src/services/models/event.model";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { matchesQuery } from "@/src/lib/search";

export const getBrowsableEvents = cache(async (query?: string): Promise<EventModel[]> => {
  try {
    const [{ data }, suspended] = await Promise.all([
      supabaseAdmin.from(TABLES.EVENTS).select("*").is("deleted_at", null),
      UserService.suspendedOrganizerIds(),
    ]);

    const events = (data ?? [])
      .map((d) => EventModel.fromJson({ ...d, eventId: d.id }))
      .filter((event: EventModel) => !suspended.has(String(event.organizerId)))
      .filter((event: EventModel) => isActiveLifecycle(eventLifecycle(event.status, event.schedule)))
      .filter((event: EventModel) => {
        const rawAccess =
          event.accessType ||
          ((event.visibility as string) === "tiered" ? "vip_tiered" : event.visibility) ||
          "public";
        const access = (rawAccess as string) === "tiered" ? "vip_tiered" : rawAccess;
        if (access === "private" || access === "invite_only" || access === "vip_tiered") return false;
        return access === "public" || access === "hybrid";
      });

    const q = String(query || "").trim();
    if (!q) return events;
    return events.filter((e) => matchesQuery(q, [e.title, e.shortDescription, e.category, e.location?.city]));
  } catch (err) {
    console.error("[getBrowsableEvents]", err);
    return [];
  }
});
