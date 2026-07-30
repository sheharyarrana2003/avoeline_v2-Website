import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * Header bell with an unread badge. Used by both the organizer and vendor
 * headers; the count is resolved server-side in each layout and passed down,
 * because the headers are Client Components and can't read Firestore.
 */
export function NotificationBell({ href, unreadCount = 0 }: { href: string; unreadCount?: number }) {
    const hasUnread = unreadCount > 0;

    return (
        <Link
            href={href}
            aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
            className="relative text-gray-500 hover:text-black transition-colors"
        >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {hasUnread && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#6366f1] text-white text-[10px] font-semibold leading-4 text-center tabular-nums">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </Link>
    );
}
