import Link from "next/link";
import { NotificationServices } from "@/src/services/notification.services";
import { NotificationData } from "@/src/services/models/notification.model";
import { timeAgo } from "@/src/lib/datetime";
import { markAllNotificationsRead, markNotificationRead } from "./actions/markRead.action";

type TabKey = "all" | "unread" | "registrations" | "vendors" | "system";

const TABS: { key: TabKey; label: string; filter: (n: NotificationData) => boolean }[] = [
    { key: "all", label: "All", filter: () => true },
    {
        key: "unread",
        label: "Unread",
        filter: (n) => n.status !== "read",
    },
    {
        key: "registrations",
        label: "Registrations",
        filter: (n) =>
            n.type === "registration_confirmation" ||
            n.type === "booking_confirmation" ||
            n.title.toLowerCase().includes("registration"),
    },
    {
        key: "vendors",
        label: "Vendors",
        filter: (n) =>
            n.type === "vendor_quote" || n.title.toLowerCase().includes("vendor"),
    },
    {
        key: "system",
        label: "System",
        filter: (n) =>
            n.type === "event_reminder" ||
            n.type === "certificate_ready" ||
            n.priority === "high",
    },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getNotificationIcon(type: NotificationData["type"]): string {
    const map: Record<string, string> = {
        event_reminder: "⏰",
        registration_confirmation: "👤",
        payment_success: "💳",
        certificate_ready: "📜",
        new_message: "💬",
        vendor_quote: "📄",
        booking_confirmation: "✅",
    };
    return map[type] || "🔔";
}

function getNotificationAccent(type: NotificationData["type"]): string {
    const map: Record<string, string> = {
        event_reminder: "#fef3c7",
        registration_confirmation: "#e8e8e8",
        payment_success: "#e8e8e8",
        certificate_ready: "#f0fdf4",
        new_message: "#eff6ff",
        vendor_quote: "#f0f0f0",
        booking_confirmation: "#f0fdf4",
    };
    return map[type] || "#f5f5f5";
}

function getNotificationIconColor(type: NotificationData["type"]): string {
    const map: Record<string, string> = {
        event_reminder: "#d97706",
        registration_confirmation: "#333",
        payment_success: "#333",
        certificate_ready: "#16a34a",
        new_message: "#2563eb",
        vendor_quote: "#555",
        booking_confirmation: "#16a34a",
    };
    return map[type] || "#666";
}

/**
 * The one place a notification can send you. `data.deepLink` is written as an
 * absolute path by whoever emitted it, so the same label map reads correctly for
 * an organizer and a vendor. Returns null when there is nowhere useful to go.
 */
function getActionLink(notification: NotificationData): { label: string; href: string } | null {
    const { type, data } = notification;
    if (!data.deepLink) return null;

    const labels: Record<string, string> = {
        registration_confirmation: "View Attendee",
        vendor_quote: "Review Quote",
        payment_success: "View Transaction",
        event_reminder: "View Event",
        booking_confirmation: "View Booking",
        new_message: "View Message",
    };
    return { label: labels[type] || "View Details", href: data.deepLink };
}

// ─── View ───────────────────────────────────────────────────────────────────

/**
 * Shared by the organizer and vendor notification routes. `userId` is the
 * recipient's route id — the same id notifications are addressed to.
 */
export async function NotificationsView({ userId, tab }: { userId: string; tab?: string }) {
    const notifications = await NotificationServices.getAllNotificationsOfUser(userId);

    const unreadCount = notifications.filter((n) => n.status !== "read").length;

    const activeTab = (tab as TabKey) || (unreadCount > 0 ? "unread" : "all");

    const filtered = notifications.filter(
        TABS.find((t) => t.key === activeTab)?.filter || (() => true)
    );

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            <div className="max-w-[1200px] mx-auto px-6 py-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-[22px] font-semibold text-[#111] mb-1">
                            Notifications & Alerts
                        </h1>
                        <p className="text-[13px] text-[#888]">
                            Stay updated with all platform activities
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <form action={markAllNotificationsRead}>
                            <button
                                type="submit"
                                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[#ddd] text-[#555] bg-white hover:bg-[#f0f0f0] transition-colors"
                            >
                                Mark all read
                            </button>
                        </form>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-5 border-b border-[#e5e5e5] mb-6">
                    {TABS.map((tabDef) => {
                        const count = notifications.filter(tabDef.filter).length;
                        const isActive = activeTab === tabDef.key;
                        return (
                            <Link
                                key={tabDef.key}
                                href={`?tab=${tabDef.key}`}
                                className={`relative pb-2.5 text-[13px] font-medium transition-colors ${isActive
                                        ? "text-[#111] border-b-2 border-[#111]"
                                        : "text-[#999] hover:text-[#555]"
                                    }`}
                                style={{ marginBottom: "-1px" }}
                            >
                                {tabDef.label}{" "}
                                <span
                                    className={`${isActive ? "text-[#666]" : "text-[#999]"} font-normal`}
                                >
                                    ({count})
                                </span>
                                {tabDef.key === "all" && unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-2.5 w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    {/* Left: Notifications List */}
                    <div>
                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-[14px] p-12 text-center border border-[#eee]">
                                <div className="text-4xl mb-3">🔔</div>
                                <p className="text-[#888] text-sm font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            filtered.map((notification) => {
                                const isUnread = notification.status !== "read";
                                const link = getActionLink(notification);
                                const icon = getNotificationIcon(notification.type);
                                const bg = getNotificationAccent(notification.type);
                                const iconColor = getNotificationIconColor(notification.type);

                                return (
                                    <div
                                        key={notification.notificationId}
                                        className="bg-[#f9f9f9] rounded-[14px] p-5 mb-3.5 border border-transparent transition-all hover:border-[#e0e0e0] hover:bg-[#f5f5f5]"
                                        style={{ position: "relative" }}
                                    >
                                        {isUnread && (
                                            <span className="absolute top-4.5 right-4.5 w-2 h-2 rounded-full bg-[#6366f1]" />
                                        )}
                                        <div className="flex items-start gap-3 mb-2">
                                            <div
                                                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 text-base"
                                                style={{ background: bg, color: iconColor }}
                                            >
                                                {icon}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h3 className="text-sm font-semibold text-[#111] mb-1">
                                                    {notification.title}
                                                </h3>
                                                <p className="text-xs text-[#888] mb-1.5 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <span className="text-[11px] text-[#bbb] font-medium uppercase tracking-wide">
                                                    {timeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        {(link || isUnread) && (
                                            <div className="flex gap-2 mt-3">
                                                {link && (
                                                    <Link
                                                        href={link.href}
                                                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#111] text-white hover:bg-[#333] transition-colors"
                                                    >
                                                        {link.label}
                                                    </Link>
                                                )}
                                                {isUnread && (
                                                    <form action={markNotificationRead}>
                                                        <input
                                                            type="hidden"
                                                            name="notificationId"
                                                            value={notification.notificationId}
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[#ddd] text-[#555] hover:bg-[#f0f0f0] transition-colors"
                                                        >
                                                            Mark read
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-[14px] p-5 border border-[#eee]">
                            <h4 className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest mb-4">
                                Unread Activity
                            </h4>
                            <div className="text-center py-4">
                                <div className="text-[52px] font-bold text-[#111] leading-none mb-1 tabular-nums">
                                    {unreadCount}
                                </div>
                                <div className="text-[13px] text-[#888] font-medium">New alerts</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
