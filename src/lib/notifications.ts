import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { revalidatePath } from "next/cache";

import {
    type NotificationChannel,
    type NotificationStatus,
    type NotificationDoc,
    type NotificationTemplateDoc,
    DEFAULT_NOTIFICATION_TEMPLATES,
} from "./notifications.types";

export { DEFAULT_NOTIFICATION_TEMPLATES };
export type {
    NotificationChannel,
    NotificationStatus,
    NotificationDoc,
    NotificationTemplateDoc,
};

export async function interpolateTemplate(text: string, variables: Record<string, unknown>): Promise<string> {
    if (!text) return "";
    return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
        const val = variables[key];
        return val !== undefined && val !== null ? String(val) : "";
    });
}

export async function sendNotification(
    userId: string,
    templateKey: string,
    variables: Record<string, unknown> = {},
    channels?: NotificationChannel[],
): Promise<string[]> {
    if (!userId) return [];
    try {
        let template = DEFAULT_NOTIFICATION_TEMPLATES[templateKey];
        const { data: tplRow } = await supabaseAdmin
            .from(TABLES.NOTIFICATION_TEMPLATES)
            .select("*")
            .eq("key", templateKey)
            .maybeSingle();
        if (tplRow) {
            template = {
                subject: tplRow.subject,
                body: tplRow.body,
                defaultChannels: Array.isArray(tplRow.default_channels) ? tplRow.default_channels : ["email"],
            };
        }
        if (!template) {
            template = {
                subject: String(variables.subject || "Notification from Avoeline"),
                body: String(variables.body || variables.message || "You have a new notification."),
                defaultChannels: ["email"],
            };
        }
        const title = await interpolateTemplate(template.subject, variables);
        const body = await interpolateTemplate(template.body, variables);
        const targetChannels = channels?.length ? channels : template.defaultChannels;
        const ids: string[] = [];
        for (const ch of targetChannels) {
            const { data, error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).insert({
                user_id: String(userId).trim(),
                type: templateKey,
                title,
                message: body,
                channel: ch,
                status: "pending",
                related_event_id: (variables.eventId || variables.relatedEventId || null) as string | null,
            }).select("id").single();
            if (error || !data) continue;
            ids.push(data.id);
            await dispatchNotification(data.id);
        }
        return ids;
    } catch (err) {
        console.error("[sendNotification]", err);
        return [];
    }
}

export async function dispatchNotification(notificationId: string) {
    try {
        const { data } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).select("*").eq("id", notificationId).maybeSingle();
        if (!data) return { success: false };
        console.log("[DISPATCH]", data.channel, data.user_id, data.title);
        await supabaseAdmin.from(TABLES.NOTIFICATIONS).update({
            status: "sent",
        }).eq("id", notificationId);
        return { success: true, channel: data.channel as NotificationChannel };
    } catch {
        await supabaseAdmin.from(TABLES.NOTIFICATIONS).update({ status: "failed" }).eq("id", notificationId);
        return { success: false };
    }
}

export async function getUserNotifications(userId: string, limitCount = 20): Promise<NotificationDoc[]> {
    if (!userId) return [];
    const { data } = await supabaseAdmin
        .from(TABLES.NOTIFICATIONS)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limitCount);
    return (data ?? []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        type: d.type,
        title: d.title,
        body: d.message,
        channel: d.channel,
        status: d.status,
        read: d.status === "read",
        relatedEventId: d.related_event_id,
        createdAt: d.created_at,
        sentAt: null,
    }));
}

export async function markNotificationAsReadAction(notificationId: string): Promise<boolean> {
    if (!notificationId) return false;
    const { error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).update({
        status: "read",
        read_at: new Date().toISOString(),
    }).eq("id", notificationId);
    if (error) return false;
    revalidatePath("/");
    return true;
}

export async function markAllNotificationsAsReadAction(userId: string): Promise<boolean> {
    if (!userId) return false;
    const { error } = await supabaseAdmin.from(TABLES.NOTIFICATIONS).update({
        status: "read",
        read_at: new Date().toISOString(),
    }).eq("user_id", userId);
    if (error) return false;
    revalidatePath("/");
    return true;
}
