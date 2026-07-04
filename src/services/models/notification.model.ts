export type NotificationType =
  | "event_reminder"
  | "registration_confirmation"
  | "payment_success"
  | "certificate_ready"
  | "new_message"
  | "vendor_quote"
  | "booking_confirmation";

export type NotificationPriority = "high" | "medium" | "low";

export type NotificationStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled";

export interface NotificationDataPayload {
  eventId?: string;
  registrationId?: string;
  deepLink?: string;
  action?: string;
  [key: string]: any; // Allows flexibility for dynamic payloads
}

export interface PushChannel {
  sent: boolean;
  deviceToken: string | null;
  delivered: boolean;
  read: boolean;
  sentAt: string | Date | null;
  readAt: string | Date | null;
}

export interface EmailChannel {
  sent: boolean;
  emailId: string | null;
  delivered: boolean;
  opened: boolean;
  sentAt: string | Date | null;
  openedAt: string | Date | null;
}

export interface SmsChannel {
  sent: boolean;
  phoneNumber: string | null;
  delivered: boolean;
  sentAt: string | Date | null;
}

export interface NotificationChannels {
  push?: PushChannel;
  email?: EmailChannel;
  sms?: SmsChannel;
}

export interface NotificationAnalytics {
  clickRate: number | null;
  actionTaken: string | null;
  conversion: boolean | null;
}

export interface NotificationData {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data: NotificationDataPayload;
  channels: NotificationChannels;
  priority: NotificationPriority;
  scheduledFor: string | Date | null;
  expiration: string | Date | null;
  status: NotificationStatus;
  analytics: NotificationAnalytics;
  templateId: string | null;
  language: "en" | "ur";
  createdAt: string | Date;
  sentAt: string | Date | null;
  deliveredAt: string | Date | null;
  readAt: string | Date | null;
}