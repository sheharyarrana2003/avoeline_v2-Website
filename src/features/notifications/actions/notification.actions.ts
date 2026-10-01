"use server";

import {
    getUserNotifications,
    markNotificationAsReadAction as markNotifRead,
    markAllNotificationsAsReadAction as markAllNotifsRead,
} from "@/src/lib/notifications";
import { AuthService } from "@/src/features/auth/authService";
import type { NotificationDoc } from "@/src/lib/notifications.types";

/**
 * Server action: fetch latest notifications for authenticated user.
 */
export async function fetchMyNotificationsAction(limitCount = 20): Promise<{
    notifications: NotificationDoc[];
    unreadCount: number;
}> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user) return { notifications: [], unreadCount: 0 };
        const targetId = user.userId || user.roleId;
        const list = await getUserNotifications(targetId, limitCount);
        const unreadCount = list.filter((n) => !n.read).length;
        return { notifications: list, unreadCount };
    } catch (err) {
        console.error("[fetchMyNotificationsAction] failed", err);
        return { notifications: [], unreadCount: 0 };
    }
}

/**
 * Server action: mark a notification as read.
 */
export async function markMyNotificationReadAction(notificationId: string): Promise<boolean> {
    return await markNotifRead(notificationId);
}

/**
 * Server action: mark all notifications as read for current user.
 */
export async function markAllMyNotificationsReadAction(): Promise<boolean> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user) return false;
        const targetId = user.userId || user.roleId;
        return await markAllNotifsRead(targetId);
    } catch (err) {
        console.error("[markAllMyNotificationsReadAction] failed", err);
        return false;
    }
}
