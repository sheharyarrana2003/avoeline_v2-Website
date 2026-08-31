import { cache } from "react";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";

/**
 * Platform-wide reads, for the admin panel.
 *
 * Everything in anaylService is organizer-scoped -- every fetcher there starts
 * `where("organizerId", "==", organizerId)` -- so there was no way to count
 * anything across the whole platform. These are the unscoped counterparts.
 *
 * The derive* helpers in anaylService take documents rather than an id, so they
 * work on these snapshots unchanged; this only widens the fetch.
 *
 * Every one of these is a full collection scan, which is what a platform total
 * is. ponytail: fine while the platform is small. Past a few thousand events,
 * keep the counters on an aggregate document updated on write and read that
 * instead -- Firestore has no COUNT that avoids reading the documents.
 */

export type PlatformTotals = {
    organizers: number;
    events: number;
    liveEvents: number;
    pastEvents: number;
    registrations: number;
    certificates: number;
    vendors: number;
    /** Events created per ISO week, oldest first, last 12 -- for the chart. */
    eventsPerWeek: { label: string; count: number }[];
};

/** ISO week key, e.g. "2026-W35". Zero-padded so it sorts lexically. */
function weekKey(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    // Thursday of the current week decides the year, per ISO 8601.
    target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
    const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const getPlatformTotals = cache(async (): Promise<PlatformTotals> => {
    try {
        const [organizers, events, registrations, certificates, vendors] = await Promise.all([
            adminDb.collection(COLLECTIONS.ORGANIZERS).get(),
            adminDb.collection(COLLECTIONS.EVENTS).get(),
            adminDb.collection(COLLECTIONS.REGISTRATIONS).get(),
            adminDb.collection(COLLECTIONS.CERTIFICATES).get(),
            adminDb.collection(COLLECTIONS.VENDORS).get(),
        ]);

        // "Live" means published and not yet finished, derived from the end date
        // rather than trusted from status alone -- status is written once at
        // creation and never updated, so a finished event still reads published.
        const today = new Date().toISOString().slice(0, 10);
        let liveEvents = 0;
        let pastEvents = 0;
        const perWeek = new Map<string, number>();

        events.docs.forEach((d: QueryDocumentSnapshot) => {
            const data = d.data();
            const status = String(data.status ?? "").toLowerCase();
            const created = toIsoString(data.createdAt);
            if (created) {
                const key = weekKey(created);
                if (key) perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
            }

            if (status === "draft" || status === "cancelled") return;

            // schedule dates are DD/MM/YYYY strings, so compare on a rebuilt ISO
            // key instead of parsing them into a Date.
            const parts = String(data.schedule?.endDate ?? "").split("/");
            const endIso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : "";
            if (endIso && endIso < today) pastEvents += 1;
            else liveEvents += 1;
        });

        return {
            organizers: organizers.size,
            events: events.size,
            liveEvents,
            pastEvents,
            registrations: registrations.size,
            certificates: certificates.size,
            vendors: vendors.size,
            eventsPerWeek: Array.from(perWeek.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .slice(-12)
                .map(([label, count]) => ({ label, count })),
        };
    } catch (err) {
        console.error("[getPlatformTotals] Firestore read failed", err);
        throw new Error("Failed to read platform totals", { cause: err });
    }
});
