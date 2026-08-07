import { statusMeta, type StatusTone } from "@/src/lib/status";

/**
 * Full class strings, not built from a template. Tailwind scans source text,
 * so `bg-${tone}-50` would compile to nothing at all.
 */
const TONE: Record<StatusTone, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    danger: "bg-red-50 text-red-700 ring-red-600/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
    info: "bg-sky-50 text-sky-700 ring-sky-600/20",
    neutral: "bg-gray-50 text-gray-600 ring-gray-600/20",
};

const SIZE = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-[11px]",
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
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full font-extrabold uppercase tracking-wider ring-1 ${TONE[meta.tone]} ${SIZE[size]} ${className}`}
        >
            {label ?? meta.label}
        </span>
    );
}

export default StatusBadge;
