import type { ReactNode } from "react";

type Tone = "danger" | "neutral";

const TONE: Record<Tone, string> = {
    // Solid ink reads "something failed"; a soft fill reads "nothing here".
    // Keeping the two apart is the whole point of having a tone at all -- it is
    // now weight rather than hue that does it.
    danger: "bg-danger-soft text-danger ring-1 ring-danger-line",
    neutral: "bg-muted text-ink-soft ring-1 ring-line",
};

export type RouteMessageProps = {
    /** Lucide icon, already sized by the caller. */
    icon: ReactNode;
    title: string;
    description: string;
    /** Buttons and links. Rendered in a row that wraps on narrow screens. */
    actions?: ReactNode;
    /** Error digest, stack, or anything else worth showing under the fold. */
    details?: string;
    tone?: Tone;
};

/**
 * The full-page state shown by every `error.tsx` and `not-found.tsx`. One
 * component so the boundaries cannot drift apart the way the ~25 hand-rolled
 * empty states in this codebase did.
 */
export function RouteMessage({
    icon,
    title,
    description,
    actions,
    details,
    tone = "danger",
}: RouteMessageProps) {
    return (
        // A <div>, not a <main>. DashboardBoundary wraps this and the four organizer and
        // vendor error/not-found routes re-export it, so a <main> here opened a second
        // landmark inside the layout's — and the background fought the canvas beneath it.
        <div className="flex min-h-[60vh] flex-1 items-center justify-center px-4 py-16">
            <div className="w-full max-w-md text-center">
                <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${TONE[tone]}`}
                    aria-hidden="true"
                >
                    {icon}
                </div>

                <h1 className="mt-6 text-xl font-bold tracking-tight text-ink">{title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>

                {actions ? (
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>
                ) : null}

                {details ? (
                    <details className="mt-8 text-left">
                        <summary className="cursor-pointer text-xs font-medium text-ink-soft hover:text-ink-soft">
                            Technical details
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-ink-soft">
                            {details}
                        </pre>
                    </details>
                ) : null}
            </div>
        </div>
    );
}

/** Shared button styling for the boundaries, so all four match. */
export const routeMessageButton =
    "inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-invert transition hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const routeMessageLink =
    "inline-flex items-center gap-2 rounded-full border border-line-loud px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
