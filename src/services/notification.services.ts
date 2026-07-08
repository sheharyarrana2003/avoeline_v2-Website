import { adminDb } from "@/data/admin_db";
import { NotificationData } from "./models/notification.model";
function mapToNotificationData(raw: any): NotificationData {
        if (!raw) throw new Error("Raw notification data is missing");

        const toDateOrString = (timestamp: any) => {
            if (!timestamp) return null;
            if (typeof timestamp.toDate === "function") {
                return timestamp.toDate().toISOString();
            }
            return typeof timestamp === "string" ? timestamp : new Date(timestamp).toISOString();
        };

        return {
            notificationId: raw.notificationId || "",
            userId: raw.userId || "",
            title: raw.title || "",
            message: raw.message || "",
            type: raw.type || "event_reminder",
            data: {
                eventId: raw.data?.eventId || null,
                registrationId: raw.data?.registrationId || null,
                deepLink: raw.data?.deepLink || null,
                action: raw.data?.action || null,
                ...raw.data
            },
            channels: {
                push: raw.channels?.push ? {
                    sent: !!raw.channels.push.sent,
                    deviceToken: raw.channels.push.deviceToken || null,
                    delivered: !!raw.channels.push.delivered,
                    read: !!raw.channels.push.read,
                    sentAt: toDateOrString(raw.channels.push.sentAt),
                    readAt: toDateOrString(raw.channels.push.readAt)
                } : undefined,
                email: raw.channels?.email ? {
                    sent: !!raw.channels.email.sent,
                    emailId: raw.channels.email.emailId || null,
                    delivered: !!raw.channels.email.delivered,
                    opened: !!raw.channels.email.opened,
                    sentAt: toDateOrString(raw.channels.email.sentAt),
                    openedAt: toDateOrString(raw.channels.email.openedAt)
                } : undefined,
                sms: raw.channels?.sms ? {
                    sent: !!raw.channels.sms.sent,
                    phoneNumber: raw.channels.sms.phoneNumber || null,
                    delivered: !!raw.channels.sms.delivered,
                    sentAt: toDateOrString(raw.channels.sms.sentAt)
                } : undefined
            },
            priority: raw.priority || "medium",
            scheduledFor: toDateOrString(raw.scheduledFor),
            expiration: toDateOrString(raw.expiration),
            status: raw.status || "queued",
            analytics: {
                clickRate: raw.analytics?.clickRate ?? null,
                actionTaken: raw.analytics?.actionTaken || null,
                conversion: raw.analytics?.conversion ?? null
            },
            templateId: raw.templateId || null,
            language: raw.language || "en",
            createdAt: toDateOrString(raw.createdAt) || new Date().toISOString(),
            sentAt: toDateOrString(raw.sentAt),
            deliveredAt: toDateOrString(raw.deliveredAt),
            readAt: toDateOrString(raw.readAt)
        };
    }

export const NotificationServices = {
    async getAllNotificationsOfUser(user_id: string) {
        const querySnapshot = await adminDb.collection("notifications").where("userId", "==", user_id).get();
        if (querySnapshot.empty) {
            return [];
        }
        const all_notifications: NotificationData[] = [];
        querySnapshot.forEach(x => {
            all_notifications.push(mapToNotificationData(x.data()));
        });
        return all_notifications;
    }
}