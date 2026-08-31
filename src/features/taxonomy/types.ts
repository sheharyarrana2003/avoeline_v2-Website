import type { CustomFieldOption } from "@/src/services/models/event.model";

/**
 * The event taxonomy: super-categories and event formats, both stored in
 * Firestore so the platform can describe any kind of event without a deploy.
 *
 * This file is imported by CategoryStep, a Client Component, so it must stay
 * free of `adminDb` -- even a transitive import would pull the Firebase Admin
 * SDK into the wizard's browser bundle. Reads live in taxonomy.service.ts,
 * writes in actions/taxonomy.action.ts; only pure functions and types here.
 *
 * A note on the two names. `EventFormat` is already taken in event.model.tsx
 * for 'physical' | 'virtual' | 'hybrid' (the event's `format` field), which is
 * a different concept entirely. The spec's "EventFormat" -- Seminar, Hackathon,
 * Workshop -- maps onto the event's existing `eventType` field. Hence `kind:
 * "format"` here, and nothing in this module is called EventFormat.
 */

export type TaxonomyKind = "super" | "format";

/**
 * `pending` is how an organizer's "request a new category" arrives: a real row
 * in the real collection, invisible to organizers because the dropdowns filter
 * on `approved`. That makes approving a one-field update rather than a copy
 * between an inbox collection and a live one.
 */
export type TaxonomyStatus = "approved" | "pending" | "rejected";

export interface TaxonomyEntry {
    /** Always `slugifyId(name)` -- see the note there. */
    id: string;
    /** Which collection this came from. Not stored; set by the read-mapper. */
    kind: TaxonomyKind;
    name: string;
    description: string;
    /** Deactivating hides an entry from NEW events without touching old ones. */
    active: boolean;
    status: TaxonomyStatus;
    /** The suggested starter checklist for events in this category/format. */
    checklist: string[];
    /** Extra event-creation fields. Meaningful for kind === "super" only. */
    fields: CustomFieldOption[];
    /** Organizer auth uid, when this entry began as a request. */
    requestedBy: string | null;
    requestedByName: string;
    adminNote: string;
    createdAt: string | null;
    updatedAt: string | null;
    decidedAt: string | null;
}

export const TAXONOMY_KINDS: TaxonomyKind[] = ["super", "format"];

/** "Super category" / "Event format", for labels and error messages. */
export function kindLabel(kind: TaxonomyKind): string {
    return kind === "super" ? "Super category" : "Event format";
}

/**
 * The document id IS the slug of the name.
 *
 * That is the whole reason seeding is idempotent: re-running it writes the same
 * ids, so nothing duplicates and no "does this name already exist" query is
 * needed. It also means a rename keeps the original id, which is correct --
 * events already reference it.
 */
export function slugifyId(name: string): string {
    return name
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** What an organizer may choose: live entries only, alphabetical. */
export function selectable(all: TaxonomyEntry[], kind: TaxonomyKind): TaxonomyEntry[] {
    return all
        .filter((e) => e.kind === kind && e.active && e.status === "approved")
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Everything of one kind, for the admin tables. Alphabetical too. */
export function ofKind(all: TaxonomyEntry[], kind: TaxonomyKind): TaxonomyEntry[] {
    return all.filter((e) => e.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
}

export function pendingRequests(all: TaxonomyEntry[]): TaxonomyEntry[] {
    return all
        .filter((e) => e.status === "pending")
        .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

const FIELD_TYPES: CustomFieldOption["type"][] = ["text", "number", "dropdown", "checkbox"];

/**
 * The custom-field editor is one textarea, one field per line:
 *
 *     Cuisine Type* | dropdown | Pakistani, Italian, Fusion
 *     Dietary Options | text
 *     Medical disclaimer accepted* | checkbox
 *
 * A trailing `*` on the label means required. An unrecognised or missing type
 * falls back to `text`, because a typo should cost you the right widget, not
 * the whole line -- losing a field silently is how the admin ends up debugging
 * a form instead of filling one in.
 *
 * ponytail: `fieldId` is the slug of the label, so renaming a field orphans the
 * answers already stored under the old key. Acceptable while categories are
 * being set up; if renames become routine, give the editor an explicit id
 * column and key on that instead.
 */
export function parseFieldLines(text: string): CustomFieldOption[] {
    const seen = new Set<string>();
    const fields: CustomFieldOption[] = [];

    for (const raw of String(text ?? "").split("\n")) {
        const line = raw.trim();
        if (!line) continue;

        const [labelPart = "", typePart = "", optionsPart = ""] = line.split("|").map((p) => p.trim());
        const required = labelPart.endsWith("*");
        const label = (required ? labelPart.slice(0, -1) : labelPart).trim();
        if (!label) continue;

        const fieldId = slugifyId(label);
        if (!fieldId || seen.has(fieldId)) continue;
        seen.add(fieldId);

        const asked = typePart.toLowerCase() as CustomFieldOption["type"];
        const type = FIELD_TYPES.includes(asked) ? asked : "text";

        fields.push({
            fieldId,
            label,
            type,
            options: type === "dropdown"
                ? optionsPart.split(",").map((o) => o.trim()).filter(Boolean)
                : [],
            required,
        });
    }

    return fields;
}

/** The inverse, so the admin edit form shows what is already stored. */
export function formatFieldLines(fields: CustomFieldOption[]): string {
    return fields
        .map((f) => {
            const head = `${f.label}${f.required ? "*" : ""} | ${f.type}`;
            return f.type === "dropdown" && f.options.length ? `${head} | ${f.options.join(", ")}` : head;
        })
        .join("\n");
}

export type CategoryAnswers = Record<string, string | number | boolean>;

/**
 * Labels of the required fields the organizer left blank. Checked on the server
 * at create time, not just in the form: the wizard hands over a plain object it
 * built itself, so client-side validation is a courtesy, never the enforcement.
 */
export function missingRequired(fields: CustomFieldOption[], answers: CategoryAnswers): string[] {
    return fields
        .filter((f) => {
            if (!f.required) return false;
            const v = answers?.[f.fieldId];
            // A checkbox is only satisfied by true; "" and 0 are blank for the rest.
            if (f.type === "checkbox") return v !== true;
            return v === undefined || v === null || String(v).trim() === "";
        })
        .map((f) => f.label);
}

/**
 * Spec 1.3: "auto-load a suggested default checklist/timeline template for that
 * combination". The spec's own examples are format-driven (Hackathon loads a
 * competition list, Seminar a lighter one), so the format supplies the bulk and
 * the category adds anything specific to it. Concatenating covers both readings
 * of "combination" without an N x M template table nobody would fill in.
 */
export function resolveChecklist(
    superCategory: TaxonomyEntry | undefined,
    format: TaxonomyEntry | undefined,
): string[] {
    const merged = [...(format?.checklist ?? []), ...(superCategory?.checklist ?? [])];
    return Array.from(new Set(merged.map((s) => s.trim()).filter(Boolean)));
}
