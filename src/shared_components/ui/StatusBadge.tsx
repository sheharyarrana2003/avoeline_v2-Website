import { Check, X, Clock, Loader } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { statusMeta, type StatusTone } from "@/src/lib/status";

/**
 * Five tones, no hue. Meaning is carried by three channels instead:
 *
 *   1. the text label      -- always present, so WCAG 1.4.1 was never at risk
 *   2. fill weight         -- solid ink / soft fill / no fill
 *   3. border style        -- dashed reads as "not settled yet"
 *
 * `success` and `danger` are deliberately maximal opposites (inverted fill, same
 * border weight): they are the pair a user must never confuse at a glance. Every
 * tone keeps a 1px border so swapping between them never shifts layout.
 *
 * Full class strings, not built from a template. Tailwind scans source text, so
 * `bg-${tone}-50` would compile to nothing at all.
 */
/**
 * Colour is back, on top of the icon and the label rather than instead of them.
 * WCAG asks that colour is not the SOLE channel; it never asked for no colour, and
 * hue plus icon plus text is stronger than any one of those alone. So a
 * colour-blind user still reads the tick, the cross and the word, and everyone
 * else gets the instant green/amber/red read they expect from every other product.
 *
 * The text shades are darker than the usual ones on purpose — the commonly used
 * green and amber measure 3.3 and 3.2 against white and fail as body text. These
 * clear 4.8 on the soft fills they sit on.
 */
const TONE: Record<StatusTone, { box: string; label: string; Icon: LucideIcon | null }> = {
    success: { box: "bg-success-soft text-success border-success-line", label: "", Icon: Check },
    danger: { box: "bg-danger-soft text-danger border-danger-line", label: "", Icon: X },
    warning: { box: "bg-warning-soft text-warning border-warning-line", label: "", Icon: Clock },
    info: { box: "bg-accent-soft text-accent-strong border-accent-line", label: "", Icon: Loader },
    neutral: { box: "bg-gray-100 text-gray-600 border-gray-200", label: "", Icon: null },
};

// text-2xs/text-xs rather than the arbitrary 10px/11px these were written as before
// the type scale existed. Both tokens already carry their own uppercase tracking, so
// no tracking utility is needed on the badge itself.
const SIZE = {
    sm: "gap-1 px-2 py-0.5 text-2xs",
    md: "gap-1.5 px-3 py-1 text-xs",
} as const;

export type StatusBadgeProps = {
    status: string | null | undefined;
    /** Override the canonical label. Use sparingly -- the point is consistency. */
    label?: string;
    size?: keyof typeof SIZE;
    className?: string;
};

/**
 * The one status badge. Every screen's colour and wording for a given status
 * comes from src/lib/status.ts, so a booking that is "confirmed" looks the same
 * on the quotes list, the booking card and the vendor dashboard.
 */
export function StatusBadge({ status, label, size = "md", className = "" }: StatusBadgeProps) {
    const meta = statusMeta(status);
    const tone = TONE[meta.tone];
    const Icon = tone.Icon;
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full border font-bold uppercase ${tone.box} ${SIZE[size]} ${className}`}
        >
            {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
            {/* The strike on `danger` is decorative -- screen readers announce the
                label unchanged, so this adds a channel without removing one. */}
            <span className={tone.label}>{label ?? meta.label}</span>
        </span>
    );
}

export default StatusBadge;
