import type { CustomFieldOption } from "@/src/services/models/event.model";

/**
 * Answers to a set of admin- or organizer-defined questions.
 *
 * Two things in this app ask questions it did not know about at build time: an
 * event's category fields (spec 1.4) and an event's own registration form
 * (`event.registration.customForm`). Both are `CustomFieldOption[]` and both
 * end up as a fieldId-keyed map, so reading, cleaning and displaying the
 * answers belongs in one place rather than once per caller.
 *
 * Pure and client-safe -- `taxonomy/types.ts` already holds `missingRequired`
 * for the validation half, and this is deliberately not a second copy of it.
 */
export type FieldAnswers = Record<string, string | number | boolean>;

/** Long enough for a dietary note, short enough not to be a storage vector. */
const MAX_ANSWER_LENGTH = 500;

/**
 * Pull answers off a submitted form.
 *
 * Driven by `fields`, never by what the FormData happens to contain: an input
 * named `custom_whatever` that no question defines is ignored rather than
 * stored. An unchecked checkbox sends nothing at all, which is why it reads as
 * `false` instead of being left out.
 */
export function readAnswers(formData: FormData, fields: CustomFieldOption[]): FieldAnswers {
    const answers: FieldAnswers = {};
    for (const field of fields) {
        const raw = formData.get(`custom_${field.fieldId}`);
        if (field.type === "checkbox") {
            answers[field.fieldId] = raw !== null;
            continue;
        }
        const text = String(raw ?? "").trim();
        if (!text) continue;
        if (field.type === "number") {
            const n = Number(text);
            if (Number.isFinite(n)) answers[field.fieldId] = n;
            continue;
        }
        // A dropdown answer must be one of the offered options. The <select> only
        // offers those, but the submission is a public endpoint and the option
        // list is sometimes a price band or an entitlement.
        if (field.type === "dropdown" && field.options.length && !field.options.includes(text)) continue;
        answers[field.fieldId] = text.slice(0, MAX_ANSWER_LENGTH);
    }
    return answers;
}

/**
 * Drop anything the questions do not define, and coerce what is left.
 *
 * `readAnswers` already produces a clean map, so this exists for the other
 * direction: an answers object arriving from anywhere else before it is
 * written to Firestore.
 */
export function sanitizeAnswers(fields: CustomFieldOption[], answers: FieldAnswers | undefined): FieldAnswers {
    if (!answers) return {};
    const byId = new Map(fields.map((f) => [f.fieldId, f]));
    const clean: FieldAnswers = {};
    for (const [key, value] of Object.entries(answers)) {
        const field = byId.get(key);
        if (!field || value === null || value === undefined) continue;
        if (field.type === "checkbox") clean[key] = value === true || value === "true";
        else if (field.type === "number") {
            const n = Number(value);
            if (Number.isFinite(n)) clean[key] = n;
        } else clean[key] = String(value).slice(0, MAX_ANSWER_LENGTH);
    }
    return clean;
}

/** One answer as a person reads it. Blank when they did not answer. */
export function answerText(field: CustomFieldOption, answers: FieldAnswers | undefined): string {
    const value = answers?.[field.fieldId];
    if (value === undefined || value === null || value === "") return "";
    if (field.type === "checkbox") return value === true ? "Yes" : "No";
    return String(value);
}
