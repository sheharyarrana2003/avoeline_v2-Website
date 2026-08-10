/**
 * Shared money formatting for the whole app.
 *
 * There were sixteen local copies of this before, and they disagreed on more
 * than style: twelve rendered "Rs 12,345" (what Intl does for en-PK), while
 * analytics and the attendee drawer hand-built "PKR 12,345". Same amount, two
 * different currencies as far as a reader is concerned. One module, one answer.
 */

const LOCALE = "en-PK";
const DEFAULT_CURRENCY = "PKR";

/** What to show when there is no amount at all. Callers can override. */
const DEFAULT_FALLBACK = "N/A";

/**
 * "Rs 12,345". Whole units only -- nothing in this product is priced in paisa.
 *
 * `null`/`undefined` yields `fallback` rather than "Rs 0", because a missing
 * price and a free one are not the same thing. A real `0` formats as "Rs 0".
 */
export function formatCurrency(
    amount: number | null | undefined,
    currency: string = DEFAULT_CURRENCY,
    fallback: string = DEFAULT_FALLBACK,
): string {
    if (amount == null || Number.isNaN(amount)) return fallback;
    return new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: currency || DEFAULT_CURRENCY,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * "Rs 1.2M" / "Rs 5K" -- for stat tiles and chart axes where the full number
 * does not fit. Intl's own compact notation, rather than the two hand-rolled
 * dividers this replaced (which disagreed on whether thousands were "K" or "k").
 */
export function formatCurrencyCompact(
    amount: number | null | undefined,
    currency: string = DEFAULT_CURRENCY,
    fallback: string = DEFAULT_FALLBACK,
): string {
    if (amount == null || Number.isNaN(amount)) return fallback;
    return new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: currency || DEFAULT_CURRENCY,
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(amount);
}
