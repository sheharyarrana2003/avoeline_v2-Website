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
const TONE: Record<StatusTone, { box: string; label: string; Icon: LucideIcon | null }> = {
    success: { box: "bg-gray-900 text-white border-gray-900", label: "", Icon: Check },
    danger: { box: "bg-white text-gray-900 border-gray-900", label: "line-through", Icon: X },
    warning: { box: "bg-white text-gray-700 border-gray-400 border-dashed", label: "", Icon: Clock },
    info: { box: "bg-gray-100 text-gray-700 border-gray-200", label: "", Icon: Loader },
    neutral: { box: "bg-transparent text-gray-500 border-gray-200", label: "", Icon: null },
};

const SIZE = {
    sm: "gap-1 px-2 py-0.5 text-[10px]",
    md: "gap-1.5 px-3 py-1 text-[11px]",
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
            className={`inline-flex items-center whitespace-nowrap rounded-full border font-extrabold uppercase tracking-wider ${tone.box} ${SIZE[size]} ${className}`}
        >
            {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
            {/* The strike on `danger` is decorative -- screen readers announce the
                label unchanged, so this adds a channel without removing one. */}
            <span className={tone.label}>{label ?? meta.label}</span>
        </span>
    );
}

export default StatusBadge;
