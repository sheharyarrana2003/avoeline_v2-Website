import { NextResponse } from "next/server";
import { EventService } from "@/src/services/event.service";
import { parseScheduleDateTime } from "@/src/lib/datetime";
import { buildIcs, sanitizeHeaderValue } from "@/src/features/connections/lib/calendarFallbacks";
import { publicSiteUrl } from "@/src/features/email/publicSiteUrl";

export const runtime = "nodejs";

/** Public .ics for “Add to calendar” links in attendee emails (N6). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const { eventId } = await ctx.params;
  const event = await EventService.getEventByID(eventId);
  if (!event || event.status === "cancelled" || event.status === "draft") {
    return new NextResponse("Not found", { status: 404 });
  }

  const start =
    parseScheduleDateTime(event.schedule?.startDate, event.schedule?.startTime) ?? new Date();
  const end =
    parseScheduleDateTime(
      event.schedule?.endDate || event.schedule?.startDate,
      event.schedule?.endTime,
    ) ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const location = [event.location?.venueName, event.location?.address, event.location?.city]
    .filter(Boolean)
    .join(", ");

  const ics = buildIcs({
    uid: event.id,
    title: event.title || "Event",
    description: event.shortDescription || undefined,
    location: location || undefined,
    url: publicSiteUrl(`/events/${event.id}`),
    start,
    end,
  });

  const filename = `${sanitizeHeaderValue(event.title || "event", 40).replace(/\s+/g, "_")}.ics`;
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
