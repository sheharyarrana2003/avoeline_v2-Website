import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { listAllEvents } from "./admin.service";
import type { EventModel } from "@/src/services/models/event.model";

export type AdminEventRow = {
  event: EventModel;
  bannerUrl: string;
  registrations: number;
  hostLabel: string;
};

/** Enrich platform event list with thumb, reg count, and org/organizer label. */
export const listAdminEventRows = cache(async (): Promise<AdminEventRow[]> => {
  const events = await listAllEvents();
  if (!events.length) return [];

  const organizerIds = [...new Set(events.map((e) => e.organizerId).filter(Boolean))];
  const eventIds = events.map((e) => e.id);

  const [{ data: profiles }, { data: orgs }, { data: eventOrgs }] = await Promise.all([
    organizerIds.length
      ? supabaseAdmin
          .from(TABLES.ORGANIZER_PROFILES)
          .select("user_id, org_name, org_id")
          .in("user_id", organizerIds)
      : Promise.resolve({
          data: [] as { user_id: string; org_name: string | null; org_id: string | null }[],
        }),
    supabaseAdmin.from(TABLES.ORGANIZATIONS).select("id, name, org_type, parent_org_id"),
    supabaseAdmin.from(TABLES.EVENTS).select("id, org_id, registrations_count").in("id", eventIds),
  ]);

  const orgById = new Map((orgs ?? []).map((o) => [String(o.id), o]));
  const profileByUser = new Map((profiles ?? []).map((p) => [String(p.user_id), p]));
  const metaByEvent = new Map((eventOrgs ?? []).map((e) => [String(e.id), e]));

  return events.map((event) => {
    const meta = metaByEvent.get(event.id);
    const profile = profileByUser.get(event.organizerId);
    const orgId = meta?.org_id
      ? String(meta.org_id)
      : profile?.org_id
        ? String(profile.org_id)
        : "";
    const org = orgId ? orgById.get(orgId) : null;
    let hostLabel = String(profile?.org_name || "Organizer");
    if (org) {
      if (org.org_type === "club") {
        const parent = org.parent_org_id ? orgById.get(String(org.parent_org_id)) : null;
        hostLabel = parent ? `${org.name} · ${parent.name}` : String(org.name);
      } else if (org.org_type === "department") {
        hostLabel = `${org.name} · ${profile?.org_name || "dept"}`;
      }
    }

    return {
      event,
      bannerUrl: event.bannerImage || "",
      registrations: Number(meta?.registrations_count ?? event.analytics?.registrations ?? 0),
      hostLabel,
    };
  });
});
