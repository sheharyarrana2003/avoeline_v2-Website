import Link from "next/link";
import {
    AlarmClock,
    Bell,
    BellOff,
    CheckCircle2,
    CreditCard,
    FileText,
    MessageSquare,
    ScrollText,
    UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NotificationServices } from "@/src/services/notification.services";
import { NotificationData } from "@/src/services/models/notification.model";
import { timeAgo } from "@/src/lib/datetime";
import { buttonClass } from "@/src/lib/ui";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
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

const TYPE_ICON: Record<string, LucideIcon> = {
    event_reminder: AlarmClock,
    registration_confirmation: UserPlus,
    payment_success: CreditCard,
    certificate_ready: ScrollText,
    new_message: MessageSquare,
    vendor_quote: FileText,
    booking_confirmation: CheckCircle2,
};

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
        // Both notification routes render this component directly, so the page shell has
        // to live here — without it the title sat flush against the top of the viewport
        // and the list stretched the full width of the screen.
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <PageHeader
                    title="Notifications"
                    description="Everything the platform has flagged for you, newest first."
                    actions={
                        unreadCount > 0 ? (
                            <form action={markAllNotificationsRead}>
                                <SubmitButton pendingText="Marking…" className={buttonClass("secondary", "sm")}>
                                    Mark all read
                                </SubmitButton>
                            </form>
                        ) : null
                    }
                />

                {/* -mb-px pulls the row onto the rule below it so the active underline replaces
                    it rather than stacking a second line under the tab. */}
                <div className="-mb-px flex gap-6 border-b border-line">
                    {TABS.map((tabDef) => {
                        const count = notifications.filter(tabDef.filter).length;
                        const isActive = activeTab === tabDef.key;
                        return (
                            <Link
                                key={tabDef.key}
                                href={`?tab=${tabDef.key}`}
                                aria-current={isActive ? "page" : undefined}
                                className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                                    isActive
                                        ? "border-gray-900 text-ink"
                                        : "border-transparent text-ink-soft hover:text-ink"
                                }`}
                            >
                                {tabDef.label} <span className="font-normal tabular-nums">({count})</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-6 space-y-3">
                    {filtered.length === 0 ? (
                        <EmptyState
                            icon={<BellOff className="h-6 w-6" />}
                            title={activeTab === "unread" ? "Nothing unread" : "No notifications yet"}
                            description={
                                activeTab === "unread"
                                    ? "You have read everything. Switch to All to see the history."
                                    : "Quotes, bookings and payment updates land here as they happen."
                            }
                            action={
                                activeTab === "unread" ? (
                                    <Link href="?tab=all" className={buttonClass("secondary", "sm")}>
                                        View all
                                    </Link>
                                ) : null
                            }
                        />
                    ) : (
                        filtered.map((notification) => {
                            const isUnread = notification.status !== "read";
                            const link = getActionLink(notification);
                            const Icon = TYPE_ICON[notification.type] ?? Bell;

                            return (
                                <article
                                    key={notification.notificationId}
                                    className="relative rounded-2xl border border-line bg-paper p-5"
                                >
                                    {/* Decoration only — "Mark read" below is the accessible carrier
                                        of unread state, so the dot never has to stand alone. */}
                                    {isUnread && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute right-4 top-4 h-2 w-2 rounded-full bg-gray-900"
                                        />
                                    )}

                                    <div className="flex items-start gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-soft"
                                        >
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 flex-1 pr-4">
                                            <h3 className="text-sm font-semibold text-ink">{notification.title}</h3>
                                            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                                                {notification.message}
                                            </p>
                                            <span className="mt-1.5 block text-2xs font-medium uppercase text-ink-soft tabular-nums">
                                                {timeAgo(notification.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {(link || isUnread) && (
                                    <div className="mt-3 flex gap-2 pl-12">
                                        {link && (
                                            <Link href={link.href} className={buttonClass("primary", "sm")}>
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
                                                    className={buttonClass("ghost", "sm")}
                                                >
                                                    Mark read
                                                </SubmitButton>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })
                )}
            </div>
            </div>
        </div>
    );
}
