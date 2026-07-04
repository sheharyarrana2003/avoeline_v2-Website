"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NotificationServices } from "@/src/services/notification.services";
import { NotificationData } from "@/src/services/models/notification.model";


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

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} MINUTE${diffMins > 1 ? "S" : ""} AGO`;
    if (diffHours < 24) return `${diffHours} HOUR${diffHours > 1 ? "S" : ""} AGO`;
    if (diffDays < 7) return `${diffDays} DAY${diffDays > 1 ? "S" : ""} AGO`;
    return then.toLocaleDateString();
}

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

function getActionButtons(notification: NotificationData): { label: string; href?: string; action?: string }[] {
    const { type, data } = notification;

    if (type === "registration_confirmation") {
        return [
            { label: "View Attendee", href: data.deepLink || `#attendee-${data.registrationId}` },
            { label: "Message Attendee", action: "message" },
        ];
    }
    if (type === "vendor_quote") {
        return [
            { label: "Review Quote", href: data.deepLink || `#quote` },
            { label: "Message Vendor", action: "message_vendor" },
        ];
    }
    if (type === "payment_success") {
        return [
            { label: "View Transaction", href: data.deepLink || `#transaction` },
            { label: "Download Report", action: "download" },
        ];
    }
    if (type === "event_reminder") {
        return [
            { label: "View Event", href: data.deepLink || `#event-${data.eventId}` },
        ];
    }
    if (type === "booking_confirmation") {
        return [
            { label: "View Booking", href: data.deepLink || `#booking` },
        ];
    }
    if (type === "new_message") {
        return [
            { label: "View Message", href: data.deepLink || `#message` },
            { label: "Reply", action: "reply" },
        ];
    }
    if (type === "certificate_ready") {
        return [
            { label: "Download Certificate", action: "download_cert" },
        ];
    }
    return [
        { label: "View Details", href: data.deepLink || `#` },
    ];
}


export default async function Noti({
    params,
    searchParams,
}: {
    params: Promise<{ organizer_id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const awaited_search_params = await searchParams;
    const resolvedParams = await params;
    const organizerId = resolvedParams.organizer_id;

    const notifications: NotificationData[] | null = await NotificationServices.getAllNotificationsOfUser(organizerId);


    const activeTab =
        (awaited_search_params.tab as TabKey) ||
        (notifications.some((n) => n.status !== "read") ? "unread" : "all");

    const filtered = notifications.filter(
        TABS.find((t) => t.key === activeTab)?.filter || (() => true)
    );

    const unreadCount = notifications.filter((n) => n.status !== "read").length;

    // Priority alerts: high priority + pending/overdue items
    const priorityAlerts = notifications
        .filter(
            (n) =>
                n.priority === "high" &&
                n.status !== "read" &&
                (n.type === "vendor_quote" || n.type === "event_reminder")
        )
        .slice(0, 5);

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
                    <div className="flex items-center gap-2.5">
                        <button className="px-4 py-2 bg-[#111] text-white text-[13px] font-medium rounded-lg hover:bg-[#333] transition-colors">
                            Mark All as Read
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#ddd] bg-white text-[#555] hover:bg-[#f0f0f0] transition-colors">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-5 border-b border-[#e5e5e5] mb-6">
                    {TABS.map((tab) => {
                        const count = notifications.filter(tab.filter).length;
                        const isActive = activeTab === tab.key;
                        return (
                            <Link
                                key={tab.key}
                                href={`?tab=${tab.key}`}
                                className={`relative pb-2.5 text-[13px] font-medium transition-colors ${isActive
                                        ? "text-[#111] border-b-2 border-[#111]"
                                        : "text-[#999] hover:text-[#555]"
                                    }`}
                                style={{ marginBottom: "-1px" }}
                            >
                                {tab.label}{" "}
                                <span
                                    className={`${isActive ? "text-[#666]" : "text-[#999]"} font-normal`}
                                >
                                    ({count})
                                </span>
                                {tab.key === "all" && unreadCount > 0 && (
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
                                const actions = getActionButtons(notification);
                                const icon = getNotificationIcon(notification.type);
                                const bg = getNotificationAccent(notification.type);
                                const iconColor = getNotificationIconColor(notification.type);

                                return (
                                    <div
                                        key={notification.notificationId}
                                        className={`bg-[#f9f9f9] rounded-[14px] p-5 mb-3.5 border transition-all hover:border-[#e0e0e0] hover:bg-[#f5f5f5] ${isUnread ? "border-transparent" : "border-transparent"
                                            }`}
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
                                                    {timeAgo(notification.createdAt.toLocaleString())}
                                                </span>
                                            </div>
                                        </div>
                                        {actions.length > 0 && (
                                            <div className="flex gap-2 mt-3">
                                                {actions.map((action, idx) =>
                                                    action.href ? (
                                                        <Link
                                                            key={idx}
                                                            href={action.href}
                                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${idx === 0
                                                                    ? "bg-[#111] text-white hover:bg-[#333]"
                                                                    : "border border-[#ddd] text-[#555] hover:bg-[#f0f0f0]"
                                                                }`}
                                                        >
                                                            {action.label}
                                                        </Link>
                                                    ) : (
                                                        <button
                                                            key={idx}
                                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${idx === 0
                                                                    ? "bg-[#111] text-white hover:bg-[#333]"
                                                                    : "border border-[#ddd] text-[#555] hover:bg-[#f0f0f0]"
                                                                }`}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    )
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
                        {/* Unread Activity */}
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
                            <div className="flex items-end justify-center gap-1.5 mt-4 h-10">
                                {[16, 24, 36, 20, 28, 14].map((h, i) => (
                                    <div
                                        key={i}
                                        className={`w-6 rounded-sm ${i === 2 ? "bg-[#111]" : "bg-[#e5e5e5]"}`}
                                        style={{ height: `${h}px` }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Priority Alerts */}
                        <div className="bg-white rounded-[14px] p-5 border border-[#eee]">
                            <h4 className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest mb-3">
                                Priority Alerts
                            </h4>
                            {priorityAlerts.length === 0 ? (
                                <p className="text-xs text-[#bbb] py-2">No priority alerts</p>
                            ) : (
                                <ul className="space-y-0">
                                    {priorityAlerts.map((alert, i) => (
                                        <li
                                            key={alert.notificationId}
                                            className="flex items-start gap-2.5 py-2 text-[13px] text-[#444] leading-snug cursor-pointer hover:text-[#111] transition-colors"
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0
                                                        ? "bg-[#ef4444]"
                                                        : i === 1
                                                            ? "bg-[#f97316]"
                                                            : "bg-[#eab308]"
                                                    }`}
                                            />
                                            {alert.title}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-[14px] p-5 border border-[#eee]">
                            <h4 className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest mb-3">
                                Quick Actions
                            </h4>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button className="bg-[#f5f5f5] border border-[#eee] rounded-[10px] p-4 text-center hover:bg-[#eee] hover:border-[#ddd] transition-all cursor-pointer">
                                    <div className="text-xl mb-1.5 text-[#666]">📢</div>
                                    <div className="text-[11px] font-medium text-[#555] leading-tight">
                                        Send
                                        <br />
                                        Announcement
                                    </div>
                                </button>
                                <button className="bg-[#f5f5f5] border border-[#eee] rounded-[10px] p-4 text-center hover:bg-[#eee] hover:border-[#ddd] transition-all cursor-pointer">
                                    <div className="text-xl mb-1.5 text-[#666]">📋</div>
                                    <div className="text-[11px] font-medium text-[#555] leading-tight">
                                        Review Vendor
                                        <br />
                                        Quotes
                                    </div>
                                </button>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
}