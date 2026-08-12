import type { ReactNode } from "react";

export type EmptyStateProps = {
    /** Lucide icon or emoji. Decorative -- the title carries the meaning. */
    icon?: ReactNode;
    title: string;
    /** Say what to do about it, not just that there is nothing. */
    description?: string;
    /** A link or button that resolves the emptiness. */
    action?: ReactNode;
    /** Compact form for a panel inside a page rather than a whole page. */
    size?: "sm" | "md";
    className?: string;
};

/**
 * The one "there is nothing here yet" block.
 *
 * There were about twenty-five of these written by hand in four different
 * treatments -- a full card with a call to action, a card with an emoji, a
 * bare grey paragraph, and in one case `return null`, which rendered a blank
 * space with no explanation at all.
 *
 * Bounded on purpose: the dashed rule says "this region works and is empty",
 * where centred text floating in whitespace read as a region that failed. The
 * border is decoration around a whole region, never a control, so line-loud
 * (1.42:1 on canvas) is the right weight -- loud enough to see, quiet enough that a
 * placeholder does not out-rank the section title above it. Same reason the
 * title is font-medium rather than bold.
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    size = "md",
    className = "",
}: EmptyStateProps) {
    const pad = size === "sm" ? "py-8" : "py-12";

    return (
        <div
            className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-line-loud px-6 text-center ${pad} ${className}`}
        >
            {/* Bare glyph, not a filled chip: after the hue purge the non-text channel is
                scarce, and a 48px grey circle spends more ink than the message it labels. */}
            {icon ? (
                <span className="mb-3 text-gray-400" aria-hidden="true">
                    {icon}
                </span>
            ) : null}

            <p className="text-base font-medium text-ink">{title}</p>

            {description ? <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p> : null}

            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

export default EmptyState;
