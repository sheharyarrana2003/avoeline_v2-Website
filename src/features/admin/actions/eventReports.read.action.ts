"use server";

import { requireAdminArea } from "@/src/features/admin/guard";
import { listReportsForEvent } from "@/src/features/admin/eventModeration.service";
import type { EventReportRow } from "@/src/features/admin/eventModeration.types";

/** Load reports for the review drawer (events:view). */
export async function listEventReportsForDrawer(eventId: string): Promise<EventReportRow[]> {
  const admin = await requireAdminArea("events");
  if (!admin) return [];
  return listReportsForEvent(eventId);
}
