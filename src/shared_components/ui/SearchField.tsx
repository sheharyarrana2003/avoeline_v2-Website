import Link from "next/link";
import { Search, X } from "lucide-react";
import { fieldClass } from "@/src/lib/ui";

/**
 * The list search box.
 *
 * A plain `<form method="get">`, which means no client component, no state, no
 * debounce, and no JavaScript required — submitting navigates to `?q=...` and the
 * page re-renders on the server with the term applied. The URL stays shareable and
 * the back button works, both of which a controlled input filtering in memory
 * would have thrown away.
 *
 * `keep` is load-bearing: these screens already carry a `status`, `tab` or
 * `filter` param, and a GET form submits ONLY its own fields — so without hidden
 * inputs, searching would silently drop you back to the default tab.
 */
export function SearchField({
    action,
    placeholder = "Search",
    defaultValue = "",
    keep = {},
    label = "Search this list",
}: {
    /** The current path, e.g. `/organizer/123/events`. */
    action: string;
    placeholder?: string;
    defaultValue?: string;
    /** Query params to preserve across the search, e.g. `{ status: "draft" }`. */
    keep?: Record<string, string | undefined>;
    /** Accessible name for the input. */
    label?: string;
}) {
    const kept = Object.entries(keep).filter(([, v]) => v);
    const clearHref = kept.length
        ? `${action}?${new URLSearchParams(kept as [string, string][]).toString()}`
        : action;

    return (
        <form action={action} method="get" role="search" className="relative w-full sm:max-w-xs">
            {kept.map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
            ))}

            <label htmlFor="list-search" className="sr-only">
                {label}
            </label>
            <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
            />
            <input
                id="list-search"
                type="search"
                name="q"
                defaultValue={defaultValue}
                placeholder={placeholder}
                // pr-9 leaves room for the clear button; without it a long term runs
                // underneath it.
                className={`${fieldClass} pl-9 ${defaultValue ? "pr-9" : ""}`}
            />
            {defaultValue ? (
                <Link
                    href={clearHref}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            ) : null}
        </form>
    );
}
