import { cache } from "react";
import { NotificationData, NotificationType } from "./models/notification.model";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";

function mapToNotificationData(raw: Record<string, unknown>): NotificationData {
    return {
        notificationId: String(raw.id || raw.notificationId || ""),
        userId: String(raw.user_id || raw.userId || ""),
        title: String(raw.title || ""),
        message: String(raw.message || raw.body || ""),
        type: (raw.type as NotificationType) || "event_reminder",
        data: { deepLink: (raw.deep_link as string) || undefined, eventId: (raw.related_event_id as string) || undefined },
        channels: {},
        priority: "medium",
        scheduledFor: "",
        expiration: "",
        status: (raw.status as NotificationData["status"]) || "sent",
        analytics: { clickRate: null, actionTaken: null, conversion: null },
        templateId: null,
        language: "en",
        createdAt: toIsoString(raw.created_at || raw.createdAt) || new Date().toISOString(),
        sentAt: toIsoString(raw.sent_at),
        deliveredAt: "",
        readAt: toIsoString(raw.read_at),
    };
}

export interface NewNotification {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    deepLink?: string;
}

export const NotificationServices = {
    getAllNotificationsOfUser: cache(async (user_id: string) => {
        const { data } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).select("*").eq("user_id", user_id);
        const all = (data ?? []).map((x) => mapToNotificationData(x));
        all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return all;
    }),

    async createNotification(input: NewNotification): Promise<void> {
        try {
            if (!input.userId) return;
            await supabaseAdmin.from(TABLES.NOTIFICATIONS).insert({
                user_id: input.userId,
                title: input.title,
                message: input.message,
                type: input.type,
                deep_link: input.deepLink ?? null,
                status: "sent",
            });
        } catch (err) {
            console.error("[createNotification]", err);
        }
    },
};
