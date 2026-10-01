import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Where am I.
 *
 * Only the event layout had a crumb, so roughly thirty routes gave no indication of
 * where they sat — you could reach a counter-offer form four levels deep with
 * nothing on screen naming the booking, the event, or the way back out. The rail
 * marks the section, which is not the same thing as the path.
 *
 * The last item is the current page: rendered as text with aria-current, never a
 * link, because a link to the page you are already on is a dead control.
 */

export interface Crumb {
    label: string;
    /** Omit on the final crumb — that one is the current page. */
    href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
    if (items.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                {items.map((item, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li key={`${item.label}-${i}`} className="flex items-center gap-1">
                            {i > 0 ? (
                                <ChevronRight className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden="true" />
                            ) : null}
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="rounded-xs transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className={isLast ? "font-medium text-ink" : undefined} aria-current={isLast ? "page" : undefined}>
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
