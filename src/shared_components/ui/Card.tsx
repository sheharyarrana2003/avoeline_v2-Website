import type { ReactNode } from "react";

/**
 * The one card.
 *
 * `rounded-2xl border border-line bg-paper` was written out inline at roughly two
 * hundred sites, which is why every panel in the product had exactly the same
 * weight: when the only card is a hairline box, nothing on a page can be louder
 * than anything else, and hierarchy has to be carried by position alone.
 *
 * So the point of this component is not to save the string — it is `tone`. Three
 * weights, and a screen should use at most two of them:
 *
 *   flat    the default. A hairline box. Most cards.
 *   raised  lifted off the canvas with a contact shadow. The one card that matters.
 *   panel   ink. The single loudest thing on the screen — a hero figure, nothing else.
 *
 * `panel` is `.ink-panel`, which stays dark in BOTH themes (see --panel-bg): --ink
 * is text and resolves to near-white in dark mode, so a panel painted with it would
 * become a white slab carrying white text.
 *
 * A Server Component, and `title`/`action` arrive as rendered nodes, so a page can
 * hand it a <Link> or a client island without a function crossing the RSC boundary —
 * the same contract PageHeader already uses.
 */

type Tone = "flat" | "raised" | "panel";

const TONE: Record<Tone, string> = {
    flat: "border border-line bg-paper",
    raised: "border border-line bg-paper shadow-sm",
    panel: "ink-panel on-ink",
};

export function Card({
    tone = "flat",
    title,
    action,
    interactive = false,
    className = "",
    children,
}: {
    tone?: Tone;
    title?: ReactNode;
    action?: ReactNode;
    /** Adds the hover lift. Only for a card that is itself a link or a button. */
    interactive?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`rounded-2xl ${TONE[tone]} ${interactive ? "lift" : ""} ${className}`}>
            {title ? (
                // The header rule is inset rather than full-bleed: a line running the
                // full width of a rounded box cuts its corners off visually.
                <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                    <h2 className="font-display text-base text-ink">{title}</h2>
                    {action ? <div className="shrink-0 text-sm">{action}</div> : null}
                </div>
            ) : null}
            {children}
        </div>
    );
}

/**
 * Body padding as a separate piece, because a table or a list needs to reach the
 * card's edges while prose must not. Putting padding on Card itself would force
 * every table to undo it with a negative margin.
 */
export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}
