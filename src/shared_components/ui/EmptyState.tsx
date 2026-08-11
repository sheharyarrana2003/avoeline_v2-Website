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
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    size = "md",
    className = "",
}: EmptyStateProps) {
    const pad = size === "sm" ? "py-8" : "py-14";

    return (
        <div className={`flex flex-col items-center justify-center px-6 text-center ${pad} ${className}`}>
            {icon ? (
                <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                    aria-hidden="true"
                >
                    {icon}
                </div>
            ) : null}

            <p className={`font-bold text-gray-900 ${size === "sm" ? "text-sm" : "text-base"}`}>{title}</p>

            {description ? (
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">{description}</p>
            ) : null}

            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

export default EmptyState;
