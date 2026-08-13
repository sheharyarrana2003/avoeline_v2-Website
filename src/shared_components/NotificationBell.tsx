import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * Bell with an unread badge. Used by both dashboards; the count is resolved
 * server-side in each layout and passed down, because the nav is a Client
 * Component and can't read Firestore.
 *
 * `onInk` flips it for the dark sidebar rail -- the badge has to invert there or
 * a near-black pill on a near-black rail disappears.
 */
export function NotificationBell({
    href,
    unreadCount = 0,
    onInk = false,
}: {
    href: string;
    unreadCount?: number;
    onInk?: boolean;
}) {
    const hasUnread = unreadCount > 0;

    return (
        <Link
            href={href}
            aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
            className={`relative transition-colors ${
                onInk ? "text-white/70 hover:text-white" : "text-ink-soft hover:text-black"
            }`}
        >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {hasUnread && (
                <span
                    className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold leading-4 text-center tabular-nums ${
                        onInk ? "bg-white text-gray-950" : "bg-ink text-ink-invert"
                    }`}
                >
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </Link>
    );
}
