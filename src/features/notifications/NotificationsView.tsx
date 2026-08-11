import Link from "next/link";
import { NotificationServices } from "@/src/services/notification.services";
import { NotificationData } from "@/src/services/models/notification.model";
import { timeAgo } from "@/src/lib/datetime";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { markAllNotificationsRead, markNotificationRead } from "./actions/markRead.action";

type TabKey = "all" | "unread";

// ponytail: two tabs, because only two notification types are ever written
// (vendor_quote and booking_confirmation) and both roles receive both. The
// previous Registrations/Vendors/System tabs were organizer-shaped and actively
// wrong when reused here: a vendor got a "Vendors" tab that is structurally
// always 0 for them, and "Quote accepted" filed under "Registrations". Add
// category tabs back when there are enough distinct types to sort, and make them
// role-aware when the two roles stop receiving the same set.
const TABS: { key: TabKey; label: string; filter: (n: NotificationData) => boolean }[] = [
    { key: "all", label: "All", filter: () => true },
    { key: "unread", label: "Unread", filter: (n) => n.status !== "read" },
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
        event_reminder: "#f5f5f5",
        registration_confirmation: "#e8e8e8",
        payment_success: "#e8e8e8",
        certificate_ready: "#f5f5f5",
        new_message: "#f5f5f5",
        vendor_quote: "#f0f0f0",
        booking_confirmation: "#f5f5f5",
    };
    return map[type] || "#f5f5f5";
}

function getNotificationIconColor(type: NotificationData["type"]): string {
    const map: Record<string, string> = {
        event_reminder: "#171717",
        registration_confirmation: "#333",
        payment_success: "#333",
        certificate_ready: "#171717",
        new_message: "#171717",
        vendor_quote: "#555",
        booking_confirmation: "#171717",
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
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-[1200px] mx-auto px-6 py-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-[22px] font-semibold text-gray-900 mb-1">
                            Notifications & Alerts
                        </h1>
                        <p className="text-[13px] text-gray-500">
                            Stay updated with all platform activities
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <form action={markAllNotificationsRead}>
                            <SubmitButton
                                pendingText="Marking…"
                                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 bg-white hover:bg-gray-100 transition-colors disabled:opacity-60"
                            >
                                Mark all read
                            </SubmitButton>
                        </form>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-5 border-b border-gray-200 mb-6">
                    {TABS.map((tabDef) => {
                        const count = notifications.filter(tabDef.filter).length;
                        const isActive = activeTab === tabDef.key;
                        return (
                            <Link
                                key={tabDef.key}
                                href={`?tab=${tabDef.key}`}
                                className={`relative pb-2.5 text-[13px] font-medium transition-colors ${isActive
                                        ? "text-gray-900 border-b-2 border-gray-900"
                                        : "text-gray-500 hover:text-gray-600"
                                    }`}
                                style={{ marginBottom: "-1px" }}
                            >
                                {tabDef.label}{" "}
                                <span
                                    className={`${isActive ? "text-gray-500" : "text-gray-500"} font-normal`}
                                >
                                    ({count})
                                </span>
                                {tabDef.key === "all" && unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-2.5 w-1.5 h-1.5 rounded-full bg-gray-900" />
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
                            <div className="bg-white rounded-[14px] p-12 text-center border border-gray-200">
                                <div className="text-4xl mb-3">🔔</div>
                                <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
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
                                        className="bg-gray-50 rounded-[14px] p-5 mb-3.5 border border-transparent transition-all hover:border-gray-200 hover:bg-gray-100"
                                        style={{ position: "relative" }}
                                    >
                                        {isUnread && (
                                            <span className="absolute top-4.5 right-4.5 w-2 h-2 rounded-full bg-gray-900" />
                                        )}
                                        <div className="flex items-start gap-3 mb-2">
                                            <div
                                                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 text-base"
                                                style={{ background: bg, color: iconColor }}
                                            >
                                                {icon}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                                    {notification.title}
                                                </h3>
                                                <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
                                                    {timeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        {(link || isUnread) && (
                                            <div className="flex gap-2 mt-3">
                                                {link && (
                                                    <Link
                                                        href={link.href}
                                                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
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
                                                        <SubmitButton
                                                            pendingText="Marking…"
                                                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-60"
                                                        >
                                                            Mark read
                                                        </SubmitButton>
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
                        <div className="bg-white rounded-[14px] p-5 border border-gray-200">
                            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
                                Unread Activity
                            </h4>
                            <div className="text-center py-4">
                                <div className="text-[52px] font-bold text-gray-900 leading-none mb-1 tabular-nums">
                                    {unreadCount}
                                </div>
                                <div className="text-[13px] text-gray-500 font-medium">New alerts</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
