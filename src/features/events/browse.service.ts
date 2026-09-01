import { cache } from "react";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { EventModel } from "@/src/services/models/event.model";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { isListedPublicly } from "@/src/features/access/access.service";
import { matchesQuery } from "@/src/lib/search";

/**
 * Events a stranger may browse.
 *
 * Spec 2.1 wants public events "listed on the public Browse Events page;
 * searchable", and there was no such page or query -- every events read in the
 * app started `where("organizerId", "==", ...)`, so nothing could list across
 * organizers.
 *
 * Reads the collection and filters in memory rather than with
 * `where("visibility", "in", [...]) + where("status", ...)`: that pair needs a
 * composite index, none is declared for it, and the lifecycle test is derived
 * from the schedule rather than stored so Firestore could not express it anyway.
 *
 * ponytail: a full scan, fine at this size. Past a few thousand events, store a
 * denormalized `listed` boolean on the event and index that.
 */
export const getBrowsableEvents = cache(async (query?: string): Promise<EventModel[]> => {
    try {
        const snap = await adminDb.collection(COLLECTIONS.EVENTS).get();
        const events = snap.docs
            .map((d: QueryDocumentSnapshot) => EventModel.fromJson({ ...d.data(), eventId: d.id }))
            .filter((event: EventModel) => isListedPublicly(event))
            .filter((event: EventModel) => isActiveLifecycle(eventLifecycle(event.status, event.schedule)));

        const filtered = query
            ? events.filter((event: EventModel) =>
                  matchesQuery(query, [
                      event.title,
                      event.shortDescription,
                      event.category,
                      event.eventType,
                      event.location?.venueName,
                      event.location?.city,
                  ]),
              )
            : events;

        // Soonest first: a browse page is a list of what you can still attend.
        return filtered.sort((a: EventModel, b: EventModel) =>
            String(a.schedule?.startDate ?? "").localeCompare(String(b.schedule?.startDate ?? "")),
        );
    } catch (err) {
        console.error("[getBrowsableEvents] Firestore read failed", err);
        throw new Error("Failed to load events", { cause: err });
    }
});
