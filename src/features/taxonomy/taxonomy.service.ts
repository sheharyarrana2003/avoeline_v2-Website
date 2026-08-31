import { cache } from "react";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { toIsoString } from "@/src/lib/datetime";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import type { TaxonomyEntry, TaxonomyKind, TaxonomyStatus } from "./types";

const COLLECTION_FOR: Record<TaxonomyKind, string> = {
    super: COLLECTIONS.SUPER_CATEGORIES,
    format: COLLECTIONS.EVENT_FORMATS,
};

/** The Firestore collection a kind lives in. Shared with the write actions. */
export function collectionFor(kind: TaxonomyKind): string {
    return COLLECTION_FOR[kind];
}

function mapToFields(raw: any): CustomFieldOption[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((f) => f && (f.fieldId || f.label))
        .map((f) => ({
            fieldId: String(f.fieldId || ""),
            label: String(f.label || ""),
            type: f.type === "dropdown" || f.type === "checkbox" || f.type === "number" ? f.type : "text",
            options: Array.isArray(f.options) ? f.options.map(String) : [],
            required: !!f.required,
        }));
}

function mapToTaxonomyEntry(raw: any, kind: TaxonomyKind, docId: string): TaxonomyEntry {
    const status: TaxonomyStatus =
        raw?.status === "pending" || raw?.status === "rejected" ? raw.status : "approved";

    return {
        id: String(raw?.id || docId || ""),
        kind,
        name: String(raw?.name || ""),
        description: String(raw?.description || ""),
        // Anything seeded or hand-written without the flag is live, not hidden.
        active: raw?.active !== false,
        status,
        checklist: Array.isArray(raw?.checklist) ? raw.checklist.map(String).filter(Boolean) : [],
        fields: mapToFields(raw?.fields),
        requestedBy: raw?.requestedBy ? String(raw.requestedBy) : null,
        requestedByName: String(raw?.requestedByName || ""),
        adminNote: String(raw?.adminNote || ""),
        // These cross into CategoryStep, a Client Component. An admin-SDK
        // Timestamp there is a runtime error, not a warning.
        createdAt: toIsoString(raw?.createdAt),
        updatedAt: toIsoString(raw?.updatedAt),
        decidedAt: toIsoString(raw?.decidedAt),
    };
}

/**
 * Every super-category and event format, both kinds in one array.
 *
 * Two unfiltered `.get()`s rather than `where("active","==",true)` plus an
 * `orderBy`: this repo's composite indexes are not trustworthy (see the
 * firestore-io skill), the whole taxonomy is ~19 documents, and callers want
 * different slices of it -- the admin tables need the deactivated and pending
 * rows that the organizer dropdowns must not see. Filtering lives in the pure
 * helpers in ./types, so one read serves every caller.
 *
 * cache()'d, so a page and its layout reading this pay for it once per request.
 */
export const listTaxonomy = cache(async (): Promise<TaxonomyEntry[]> => {
    try {
        const [supers, formats] = await Promise.all([
            adminDb.collection(COLLECTIONS.SUPER_CATEGORIES).get(),
            adminDb.collection(COLLECTIONS.EVENT_FORMATS).get(),
        ]);

        return [
            ...supers.docs.map((d: QueryDocumentSnapshot) => mapToTaxonomyEntry(d.data(), "super", d.id)),
            ...formats.docs.map((d: QueryDocumentSnapshot) => mapToTaxonomyEntry(d.data(), "format", d.id)),
        ].filter((e) => e.name);
    } catch (err) {
        console.error("[listTaxonomy] Firestore read failed", err);
        throw new Error("Failed to fetch event categories", { cause: err });
    }
});
