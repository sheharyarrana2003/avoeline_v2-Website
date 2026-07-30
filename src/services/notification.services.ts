import { cache } from "react";
import { adminDb } from "@/data/admin_db";
import { NotificationData, NotificationType } from "./models/notification.model";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";

function mapToNotificationData(raw: any): NotificationData {
        if (!raw) throw new Error("Raw notification data is missing");

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
                    sentAt: toIsoString(raw.channels.push.sentAt),
                    readAt: toIsoString(raw.channels.push.readAt)
                } : undefined,
                email: raw.channels?.email ? {
                    sent: !!raw.channels.email.sent,
                    emailId: raw.channels.email.emailId || null,
                    delivered: !!raw.channels.email.delivered,
                    opened: !!raw.channels.email.opened,
                    sentAt: toIsoString(raw.channels.email.sentAt),
                    openedAt: toIsoString(raw.channels.email.openedAt)
                } : undefined,
                sms: raw.channels?.sms ? {
                    sent: !!raw.channels.sms.sent,
                    phoneNumber: raw.channels.sms.phoneNumber || null,
                    delivered: !!raw.channels.sms.delivered,
                    sentAt: toIsoString(raw.channels.sms.sentAt)
                } : undefined
            },
            priority: raw.priority || "medium",
            scheduledFor: toIsoString(raw.scheduledFor),
            expiration: toIsoString(raw.expiration),
            status: raw.status || "queued",
            analytics: {
                clickRate: raw.analytics?.clickRate ?? null,
                actionTaken: raw.analytics?.actionTaken || null,
                conversion: raw.analytics?.conversion ?? null
            },
            templateId: raw.templateId || null,
            language: raw.language || "en",
            createdAt: toIsoString(raw.createdAt) || new Date().toISOString(),
            sentAt: toIsoString(raw.sentAt),
            deliveredAt: toIsoString(raw.deliveredAt),
            readAt: toIsoString(raw.readAt)
        };
    }

/**
 * A notification to be written. Only the fields the UI actually reads — the
 * model's channels/analytics/templateId/scheduledFor are aspirational and stay
 * unwritten, and the read-mapper defaults them.
 */
export interface NewNotification {
    /**
     * The recipient's *route* id, exactly as stored on the source document:
     * `booking.organizerId` for an organizer, `booking.vendorId` for a vendor.
     * The two roles are keyed differently (a vendor's route id is the `vendorId`
     * field, not the auth uid — see authService.ts), so addressing by the stored
     * id is what lets each side read by the same id it routes on.
     */
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    deepLink?: string;
}

export const NotificationServices = {
    // ponytail: reads every notification a user has ever had, so the caller can
    // count unread in memory. Fine into the low hundreds per user; past that,
    // denormalize an unreadCount onto the user doc and read that for the badge.
    getAllNotificationsOfUser: cache(async (user_id: string) => {
        const querySnapshot: QuerySnapshot = await adminDb.collection(COLLECTIONS.NOTIFICATIONS).where("userId", "==", user_id).get();
        if (querySnapshot.empty) {
            return [];
        }
        const all_notifications: NotificationData[] = [];
        querySnapshot.forEach(x => {
            all_notifications.push(mapToNotificationData(x.data()));
        });

        // Sorted here, not with orderBy("createdAt"): Firestore orders by value
        // type before value, and seeded docs store createdAt as an ISO string
        // while new ones write a Timestamp — orderBy would float the whole
        // string group above the whole Timestamp group regardless of date. The
        // mapper has already normalized both shapes to ISO, so this is safe.
        all_notifications.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return all_notifications;
    }),

    /**
     * Write one notification. Never throws: it is called from the booking and
     * quote write paths, and a failed notification must not fail — or worse,
     * appear to fail after committing — the mutation that triggered it.
     */
    async createNotification(input: NewNotification): Promise<void> {
        try {
            if (!input.userId) {
                console.error("[createNotification] refusing to write with an empty userId", input.type);
                return;
            }

            const ref = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();
            await ref.set({
                notificationId: ref.id,
                userId: input.userId,
                title: input.title,
                message: input.message,
                type: input.type,
                data: { deepLink: input.deepLink ?? null },
                status: "sent",
                createdAt: new Date(),
            });
        } catch (err) {
            console.error("[createNotification]", err);
        }
    }
}
