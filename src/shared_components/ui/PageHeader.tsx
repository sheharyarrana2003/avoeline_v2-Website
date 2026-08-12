import { ReactNode } from "react";

/**
 * The organizer dashboard's masthead, lifted verbatim so every other page can
 * stop re-inventing its own title block. Server Component: `actions` arrives as
 * already-rendered children, so a page can hand it a <Link> or a client island
 * without either crossing the RSC boundary as a function.
 */
export default function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="font-display text-3xl text-ink">{title}</h1>
                {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
    );
}
