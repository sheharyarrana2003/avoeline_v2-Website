export type NotificationChannel = "email" | "push" | "sms" | "whatsapp";
export type NotificationStatus = "pending" | "sent" | "failed";

export interface NotificationDoc {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    read: boolean;
    relatedEventId?: string | null;
    createdAt: string;
    sentAt?: string | null;
}

export interface NotificationTemplateDoc {
    id: string;
    key: string;
    subject: string;
    body: string;
    defaultChannels: NotificationChannel[];
    createdAt?: string;
    updatedAt?: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: Record<
    string,
    { subject: string; body: string; defaultChannels: NotificationChannel[] }
> = {
    registration_confirmed: {
        subject: "Registration Confirmed: {{eventTitle}}",
        body: "Hello {{attendeeName}}, your registration for {{eventTitle}} has been confirmed! Your ticket is ready.",
        defaultChannels: ["email", "push"],
    },
    waitlist_promoted: {
        subject: "Good News: You're off the waitlist for {{eventTitle}}!",
        body: "A place at {{eventTitle}} has opened up and you are off the waitlist. Your registration is confirmed.",
        defaultChannels: ["email", "push"],
    },
    category_approved: {
        subject: "Category Request Approved: {{categoryName}}",
        body: "Your request for {{categoryType}} \"{{categoryName}}\" was approved by administrators. {{adminNote}}",
        defaultChannels: ["email", "push"],
    },
    category_rejected: {
        subject: "Category Request Update: {{categoryName}}",
        body: "Your request for {{categoryType}} \"{{categoryName}}\" was reviewed. {{adminNote}}",
        defaultChannels: ["email", "push"],
    },
    invite_link_sent: {
        subject: "You're invited to {{eventTitle}}",
        body: "You have been invited to register for {{eventTitle}}. Claim your ticket here: {{inviteUrl}}",
        defaultChannels: ["email"],
    },
};
