import { parseScheduleDateTime } from "@/src/lib/datetime";

/**
 * Where an event actually is in its life.
 *
 * `event.status` is written exactly once, at creation (`event.service.ts:124`,
 * `publishImmediately ? "published" : "draft"`), and nothing in this codebase
 * ever writes it again — there is no cron, no API route (CLAUDE.md forbids
 * `app/api/**`), and no action that updates it. So `ongoing`, `completed`,
 * `registration_open` and `cancelled` were all unreachable, the tabs for them
 * were permanently empty, and an event that finished weeks ago still read
 * "Published".
 *
 * The fix is not a scheduled job. One field was carrying two unrelated things:
 *
 *   intent    what the organizer decided — draft, live, cancelled. Needs a writer.
 *   position  where the event sits against the clock. Needs no storage at all,
 *             because it is a pure function of `schedule` and `now`.
 *
 * Storing the second is what created a value that goes stale the moment a date
 * passes. Deriving it on read cannot go stale, needs no migration, and needs no
 * infrastructure this project does not have.
 *
 * Every value returned here is an existing key in `src/lib/status.ts`, so
 * `statusMeta` and `StatusBadge` render it without changes.
 */
export type EventLifecycle =
    | "draft"
    | "cancelled"
    | "published" // live, but carrying no usable date — cannot be placed in time
    | "upcoming"
    | "ongoing"
    | "completed";

export interface EventScheduleish {
    startDate?: unknown;
    endDate?: unknown;
    startTime?: unknown;
    endTime?: unknown;
}

/**
 * `now` is a parameter so this is testable and so a page rendering many events
 * compares them all against one instant rather than drifting across the loop.
 */
export function eventLifecycle(
    status: string | null | undefined,
    schedule: EventScheduleish | null | undefined,
    now: Date = new Date(),
): EventLifecycle {
    const intent = String(status || "draft").toLowerCase().replace(/\s+/g, "_");

    // Intent wins outright: a cancelled event is cancelled whatever the calendar
    // says, and a draft is not "upcoming" — it is not happening at all yet.
    if (intent === "draft") return "draft";
    if (intent === "cancelled") return "cancelled";

    const start = parseScheduleDateTime(schedule?.startDate, schedule?.startTime);
    if (!start) return "published";

    // An event with a start and no end is treated as ending that same day, which
    // is what a single-day event without an explicit end time means in this data.
    const end =
        parseScheduleDateTime(schedule?.endDate ?? schedule?.startDate, schedule?.endTime) ??
        endOfDay(start);

    if (now > end) return "completed";
    if (now >= start) return "ongoing";
    return "upcoming";
}

function endOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
}

/**
 * Live and not yet finished — what "active" ought to mean on a dashboard.
 *
 * `deriveDashboardStat` counted anything `published` as active, so an event that
 * ran three weeks ago stayed in the active count forever.
 */
export function isActiveLifecycle(state: EventLifecycle): boolean {
    return state === "upcoming" || state === "ongoing" || state === "published";
}
