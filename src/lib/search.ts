/**
 * Substring matching for the list screens.
 *
 * Deliberately dumb. These lists are already fully in memory — every one of them
 * reads its whole collection for the organizer or vendor and filters in JS — so
 * search is a filter over an array, not a query. Firestore cannot do substring
 * search anyway without a second index or an external service, and nothing here
 * is at a scale that would justify one.
 *
 * Every field is coerced and lowercased, so a caller can throw numbers, nulls and
 * arrays at it without pre-formatting: `matchesQuery(q, [e.title, e.category,
 * e.capacity?.totalSeats])`.
 */
export function normalizeQuery(raw: string | string[] | undefined): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value ?? "").trim().toLowerCase();
}

export function matchesQuery(query: string, fields: unknown[]): boolean {
    if (!query) return true;
    // Space-separated terms all have to match, so "tech lahore" narrows rather
    // than searching for that exact phrase — which is what people expect a search
    // box to do and what a single includes() would get wrong.
    const terms = query.split(/\s+/).filter(Boolean);
    const haystack = fields
        .flat()
        .filter((f) => f !== null && f !== undefined && f !== "")
        .map((f) => String(f).toLowerCase())
        .join(" ");
    return terms.every((t) => haystack.includes(t));
}
