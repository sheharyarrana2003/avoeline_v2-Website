import type { ReactNode } from "react";

type Tone = "danger" | "neutral";

const TONE: Record<Tone, string> = {
    // Solid ink reads "something failed"; a soft fill reads "nothing here".
    // Keeping the two apart is the whole point of having a tone at all -- it is
    // now weight rather than hue that does it.
    danger: "bg-gray-900 text-white ring-1 ring-gray-900",
    neutral: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
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
        <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-gray-50 px-4 py-16">
            <div className="w-full max-w-md text-center">
                <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${TONE[tone]}`}
                    aria-hidden="true"
                >
                    {icon}
                </div>

                <h1 className="mt-6 text-xl font-bold tracking-tight text-gray-900">{title}</h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>

                {actions ? (
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>
                ) : null}

                {details ? (
                    <details className="mt-8 text-left">
                        <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600">
                            Technical details
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-100 p-3 text-[11px] leading-relaxed text-gray-600">
                            {details}
                        </pre>
                    </details>
                ) : null}
            </div>
        </main>
    );
}

/** Shared button styling for the boundaries, so all four match. */
export const routeMessageButton =
    "inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export const routeMessageLink =
    "inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";
