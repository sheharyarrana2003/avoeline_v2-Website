import { NotificationData } from "@/src/services/models/notification.model";


export const mockNotifications: NotificationData[] = [
  {
    notificationId: "NOT001",
    userId: "LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    title: "Event Reminder: Flutter Workshop Tomorrow",
    message: "Your workshop starts at 10:00 AM tomorrow. Don't forget!",
    type: "event_reminder",
    data: {
      eventId: "EVT001",
      registrationId: "REG001",
      deepLink: "eventflow://events/EVT001",
      action: "view_event"
    },
    channels: {
      push: {
        sent: true,
        deviceToken: "fcm_token_abc123",
        delivered: true,
        read: true,
        sentAt: "2026-06-15T09:00:00.000Z",
        readAt: "2026-06-15T09:05:00.000Z"
      },
      email: {
        sent: true,
        emailId: "msg_em_88329",
        delivered: true,
        opened: true,
        sentAt: "2026-06-15T09:00:02.000Z",
        openedAt: "2026-06-15T09:12:44.000Z"
      }
    },
    priority: "high",
    scheduledFor: "2026-06-15T09:00:00.000Z",
    expiration: "2026-06-17T00:00:00.000Z",
    status: "read",
    analytics: {
      clickRate: 100.0,
      actionTaken: "viewed_event",
      conversion: true
    },
    templateId: "TEMP_EVENT_REMINDER",
    language: "en",
    createdAt: "2026-06-14T18:30:00.000Z",
    sentAt: "2026-06-15T09:00:00.000Z",
    deliveredAt: "2026-06-15T09:00:05.000Z",
    readAt: "2026-06-15T09:05:00.000Z"
  },
  {
    notificationId: "NOT002",
    userId: "LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    title: "Vendor Quote Received",
    message: "DecoCraft Logistics sent a quote for your Design Sprint catering.",
    type: "vendor_quote",
    data: {
      bookingId: "BKN092",
      vendorId: "VND043",
      deepLink: "eventflow://bookings/BKN092/quotes",
      action: "review_quote"
    },
    channels: {
      push: {
        sent: true,
        deviceToken: "fcm_token_xyz789",
        delivered: true,
        read: false,
        sentAt: "2026-07-04T12:00:00.000Z",
        readAt: null
      },
      sms: {
        sent: true,
        phoneNumber: "+923219876543",
        delivered: true,
        sentAt: "2026-07-04T12:00:10.000Z"
      }
    },
    priority: "medium",
    scheduledFor: null,
    expiration: "2026-07-11T12:00:00.000Z",
    status: "delivered",
    analytics: {
      clickRate: null,
      actionTaken: null,
      conversion: null
    },
    templateId: "TEMP_VENDOR_QUOTE",
    language: "en",
    createdAt: "2026-07-04T11:58:30.000Z",
    sentAt: "2026-07-04T12:00:00.000Z",
    deliveredAt: "2026-07-04T12:00:15.000Z",
    readAt: null
  },
  {
    notificationId: "NOT003",
    userId: "LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    title: "Registration Confirmed!",
    message: "You are locked in for the Web3 Hackathon 2026.",
    type: "registration_confirmation",
    data: {
      eventId: "EVT099",
      deepLink: "eventflow://tickets/TIC-9923",
      action: "view_ticket"
    },
    channels: {
      email: {
        sent: true,
        emailId: "msg_em_00192",
        delivered: true,
        opened: false,
        sentAt: "2026-07-01T15:30:00.000Z",
        openedAt: null
      }
    },
    priority: "high",
    scheduledFor: null,
    expiration: null,
    status: "sent",
    analytics: {
      clickRate: 0.0,
      actionTaken: null,
      conversion: false
    },
    templateId: "TEMP_REG_CONFIRMATION",
    language: "en",
    createdAt: "2026-07-01T15:29:10.000Z",
    sentAt: "2026-07-01T15:30:00.000Z",
    deliveredAt: "2026-07-01T15:30:04.000Z",
    readAt: null
  }
];