"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Inbox, Loader2 } from "lucide-react";
import {
    fetchMyNotificationsAction,
    markMyNotificationReadAction,
    markAllMyNotificationsReadAction,
} from "@/src/features/notifications/actions/notification.actions";
import type { NotificationDoc } from "@/src/lib/notifications.types";

function formatTimeAgo(isoString: string): string {
    try {
        const diffMs = Date.now() - new Date(isoString).getTime();
        const diffSec = Math.max(0, Math.floor(diffMs / 1000));
        if (diffSec < 60) return "just now";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    } catch {
        return "";
    }
}

/**
 * In-app interactive Notification Bell with dropdown popover.
 *
 * Supports both dashboard shapes:
 * - Desktop dark sidebar rail (`onInk = true`, pops upwards/sideways)
 * - Mobile / header topbar (`onInk = false`, pops downwards)
 */
export function NotificationBell({
    href,
    unreadCount: initialUnreadCount = 0,
    onInk = false,
}: {
    href: string;
    unreadCount?: number;
    onInk?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const containerRef = useRef<HTMLDivElement>(null);

    // Keep unread count in sync if initial prop changes
    useEffect(() => {
        setUnreadCount(initialUnreadCount);
    }, [initialUnreadCount]);

    // Close on outside click or Escape key
    useEffect(() => {
        if (!open) return;

        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    // Load notifications when popover is opened
    const handleToggle = async () => {
        const nextState = !open;
        setOpen(nextState);

        if (nextState) {
            setLoading(true);
            try {
                const res = await fetchMyNotificationsAction(20);
                setNotifications(res.notifications);
                setUnreadCount(res.unreadCount);
            } catch (err) {
                console.error("[NotificationBell] fetch failed", err);
            } finally {
                setLoading(false);
            }
        }
    };

    // Mark single notification as read
    const handleMarkItemRead = (item: NotificationDoc) => {
        if (item.read) return;

        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        startTransition(async () => {
            await markMyNotificationReadAction(item.id);
        });
    };

    // Mark all as read
    const handleMarkAllRead = () => {
        if (unreadCount === 0) return;

        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        startTransition(async () => {
            await markAllMyNotificationsReadAction();
        });
    };

    const hasUnread = unreadCount > 0;

    return (
        <div ref={containerRef} className="relative inline-block text-left">
            <button
                type="button"
                onClick={handleToggle}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
                className={`relative flex items-center justify-center p-1.5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    onInk
                        ? "text-white/70 hover:text-white hover:bg-white/[0.08] focus-visible:outline-white"
                        : "text-ink-soft hover:text-ink hover:bg-muted focus-visible:outline-accent"
                }`}
            >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {hasUnread && (
                    <span
                        className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold leading-4 text-center tabular-nums shadow-xs ${
                            onInk
                                ? "bg-accent text-white"
                                : "bg-primary text-white"
                        }`}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className={`absolute z-50 w-80 sm:w-96 rounded-xl border border-line bg-paper shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                        onInk
                            ? "bottom-full mb-3 left-0"
                            : "top-full mt-2.5 right-0"
                    }`}
                >
                    {/* Popover Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface/50">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Popover Content */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-line/60">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-ink-muted text-xs gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                <span>Loading notifications...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-ink-muted">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                                    <Inbox className="w-5 h-5 text-ink-soft" />
                                </div>
                                <p className="text-sm font-medium text-ink">All caught up!</p>
                                <p className="text-xs text-ink-muted mt-0.5">You have no new notifications right now.</p>
                            </div>
                        ) : (
                            notifications.map((item) => {
                                const isUnread = !item.read;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleMarkItemRead(item)}
                                        className={`group relative p-3.5 text-left transition-colors cursor-pointer hover:bg-surface/80 ${
                                            isUnread ? "bg-primary/[0.04]" : "bg-paper"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {/* Read/Unread visual indicator */}
                                            <div className="pt-1 shrink-0">
                                                <span
                                                    className={`block w-2 h-2 rounded-full transition-colors ${
                                                        isUnread ? "bg-primary" : "bg-transparent"
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <p
                                                        className={`text-xs truncate ${
                                                            isUnread
                                                                ? "font-semibold text-ink"
                                                                : "font-medium text-ink/80"
                                                        }`}
                                                    >
                                                        {item.title}
                                                    </p>
                                                    <span className="shrink-0 text-[10px] text-ink-muted tabular-nums">
                                                        {formatTimeAgo(item.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-ink-muted line-clamp-2 mt-0.5 leading-relaxed">
                                                    {item.body}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="inline-flex items-center text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-ink-soft">
                                                        {item.channel}
                                                    </span>
                                                    {item.status === "sent" && (
                                                        <span className="text-[10px] text-success/90 font-medium">
                                                            delivered
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Popover Footer */}
                    <div className="p-2 border-t border-line bg-surface/30 text-center">
                        <Link
                            href={href}
                            onClick={() => setOpen(false)}
                            className="block py-1.5 text-xs font-medium text-ink hover:text-accent transition-colors rounded-lg hover:bg-muted"
                        >
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
