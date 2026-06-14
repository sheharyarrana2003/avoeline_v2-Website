export const mockReg = [
    {
        "registrationId": "REG001",
        "eventId": "evt_001",
        "userId": "U001",
        "organizerId": "org_001",
        "registrationDate": "2026-05-15T10:30:00.000Z",
        "registrationSource": "mobile_app",
        "status": "attended",
        "statusHistory": [
            { "status": "pending", "timestamp": "2026-05-15T10:30:00.000Z" },
            { "status": "confirmed", "timestamp": "2026-05-15T10:35:00.000Z" },
            { "status": "checked_in", "timestamp": "2026-06-12T08:45:00.000Z" },
            { "status": "attended", "timestamp": "2026-06-12T17:05:00.000Z" }
        ],
        "payment": {
            "paymentId": "PAY001",
            "amountPaid": 1500,
            "currency": "PKR",
            "paymentMethod": "jazzcash",
            "paymentStatus": "completed",
            "transactionId": "JC123456789",
            "invoiceUrl": "https://storage.events.com/invoices/INV001.pdf"
        },
        "pricingTier": "Early Bird",
        "finalPrice": 1500,
        "discountApplied": {
            "type": "student_discount",
            "percentage": 20,
            "originalPrice": 1875,
            "discountedPrice": 1500
        },
        "checkIn": {
            "checkedIn": true,
            "checkInTime": "2026-06-12T08:45:00.000Z",
            "checkInMethod": "qr_scan",
            "checkedInBy": "org_001",
            "deviceId": "device_scan_01"
        },
        "qrCode": {
            "data": "evt_001_U001_REG001",
            "imageUrl": "https://storage.events.com/qrcodes/qr_evt_001_U001.png",
            "scanCount": 2,
            "lastScanned": "2026-06-12T13:00:00.000Z"
        },
        "certificate": {
            "issued": true,
            "certificateId": "CERT_REG001",
            "issueDate": "2026-06-12T17:30:00.000Z",
            "downloadUrl": "https://storage.events.com/certificates/CERT_REG001.pdf",
            "sharedOnLinkedIn": true
        },
        "communications": [
            {
                "type": "registration_confirmation",
                "sentAt": "2026-05-15T10:35:00.000Z",
                "channel": "email",
                "status": "delivered"
            },
            {
                "type": "event_reminder",
                "sentAt": "2026-06-11T09:00:00.000Z",
                "channel": "push_notification",
                "status": "read"
            }
        ],
        "feedbackSubmitted": true,
        "rating": 4.8,
        "reviewId": "REV001",
        "metadata": {
            "ipAddress": "39.40.113.1",
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)",
            "deviceType": "mobile"
        },
        "createdAt": "2026-05-15T10:30:00.000Z",
        "updatedAt": "2026-06-13T09:00:00.000Z",
        "cancelledAt": null
    },
    {
        "registrationId": "REG002",
        "eventId": "evt_002",
        "userId": "U002",
        "organizerId": "org_001",
        "registrationDate": "2026-06-05T14:20:00.000Z",
        "registrationSource": "web",
        "status": "confirmed",
        "statusHistory": [
            { "status": "pending", "timestamp": "2026-06-05T14:20:00.000Z" },
            { "status": "confirmed", "timestamp": "2026-06-05T14:25:00.000Z" }
        ],
        "payment": {
            "paymentId": "PAY088",
            "amountPaid": 5000,
            "currency": "PKR",
            "paymentMethod": "credit_card",
            "paymentStatus": "completed",
            "transactionId": "STRIPE_ch_123987",
            "invoiceUrl": "https://storage.events.com/invoices/INV088.pdf"
        },
        "pricingTier": "Standard",
        "finalPrice": 5000,
        "discountApplied": null,
        "checkIn": {
            "checkedIn": false,
            "checkInTime": null,
            "checkInMethod": null,
            "checkedInBy": null,
            "deviceId": null
        },
        "qrCode": {
            "data": "evt_002_U002_REG002",
            "imageUrl": "https://storage.events.com/qrcodes/qr_evt_002_U002.png",
            "scanCount": 0,
            "lastScanned": null
        },
        "certificate": {
            "issued": false,
            "certificateId": null,
            "issueDate": null,
            "downloadUrl": null,
            "sharedOnLinkedIn": false
        },
        "communications": [
            {
                "type": "registration_confirmation",
                "sentAt": "2026-06-05T14:25:00.000Z",
                "channel": "email",
                "status": "delivered"
            }
        ],
        "feedbackSubmitted": false,
        "rating": null,
        "reviewId": null,
        "metadata": {
            "ipAddress": "119.160.113.45",
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
            "deviceType": "desktop"
        },
        "createdAt": "2026-06-05T14:20:00.000Z",
        "updatedAt": "2026-06-05T14:25:00.000Z",
        "cancelledAt": null
    },
    {
        "registrationId": "REG003",
        "eventId": "evt_003",
        "userId": "U001",
        "organizerId": "org_002",
        "registrationDate": "2026-06-08T09:15:00.000Z",
        "registrationSource": "mobile_app",
        "status": "cancelled",
        "statusHistory": [
            { "status": "pending", "timestamp": "2026-06-08T09:15:00.000Z" },
            { "status": "confirmed", "timestamp": "2026-06-08T09:20:00.000Z" },
            { "status": "cancelled", "timestamp": "2026-06-10T11:00:00.000Z" }
        ],
        "payment": {
            "paymentId": "PAY105",
            "amountPaid": 0,
            "currency": "PKR",
            "paymentMethod": "free_ticket",
            "paymentStatus": "completed",
            "transactionId": "FREE_TKT_001",
            "invoiceUrl": null
        },
        "pricingTier": "Free RSVP",
        "finalPrice": 0,
        "discountApplied": null,
        "checkIn": {
            "checkedIn": false,
            "checkInTime": null,
            "checkInMethod": null,
            "checkedInBy": null,
            "deviceId": null
        },
        "qrCode": {
            "data": "evt_003_U001_REG003",
            "imageUrl": "https://storage.events.com/qrcodes/qr_evt_003_U001.png",
            "scanCount": 0,
            "lastScanned": null
        },
        "certificate": {
            "issued": false,
            "certificateId": null,
            "issueDate": null,
            "downloadUrl": null,
            "sharedOnLinkedIn": false
        },
        "communications": [
            {
                "type": "registration_confirmation",
                "sentAt": "2026-06-08T09:20:00.000Z",
                "channel": "email",
                "status": "delivered"
            },
            {
                "type": "cancellation_confirmation",
                "sentAt": "2026-06-10T11:05:00.000Z",
                "channel": "email",
                "status": "delivered"
            }
        ],
        "feedbackSubmitted": false,
        "rating": null,
        "reviewId": null,
        "metadata": {
            "ipAddress": "39.40.113.1",
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)",
            "deviceType": "mobile"
        },
        "createdAt": "2026-06-08T09:15:00.000Z",
        "updatedAt": "2026-06-10T11:00:00.000Z",
        "cancelledAt": "2026-06-10T11:00:00.000Z"
    },
    {
        "registrationId": "REG004",
        "eventId": "evt_001",
        "userId": "U003",
        "organizerId": "org_001",
        "registrationDate": "2026-05-20T14:00:00.000Z",
        "registrationSource": "web",
        "status": "attended",
        "statusHistory": [
            { "status": "pending", "timestamp": "2026-05-20T14:00:00.000Z" },
            { "status": "confirmed", "timestamp": "2026-05-20T14:10:00.000Z" },
            { "status": "checked_in", "timestamp": "2026-06-12T09:05:00.000Z" },
            { "status": "attended", "timestamp": "2026-06-12T16:45:00.000Z" }
        ],
        "payment": {
            "paymentId": "PAY045",
            "amountPaid": 1500,
            "currency": "PKR",
            "paymentMethod": "easypaisa",
            "paymentStatus": "completed",
            "transactionId": "EP987654321",
            "invoiceUrl": "https://storage.events.com/invoices/INV045.pdf"
        },
        "pricingTier": "Early Bird",
        "finalPrice": 1500,
        "discountApplied": {
            "type": "university_partner",
            "percentage": 20,
            "originalPrice": 1875,
            "discountedPrice": 1500
        },
        "checkIn": {
            "checkedIn": true,
            "checkInTime": "2026-06-12T09:05:00.000Z",
            "checkInMethod": "qr_scan",
            "checkedInBy": "org_001",
            "deviceId": "device_scan_02"
        },
        "qrCode": {
            "data": "evt_001_U003_REG004",
            "imageUrl": "https://storage.events.com/qrcodes/qr_evt_001_U003.png",
            "scanCount": 1,
            "lastScanned": "2026-06-12T09:05:00.000Z"
        },
        "certificate": {
            "issued": true,
            "certificateId": "CERT_REG004",
            "issueDate": "2026-06-12T17:00:00.000Z",
            "downloadUrl": "https://storage.events.com/certificates/CERT_REG004.pdf",
            "sharedOnLinkedIn": false
        },
        "communications": [
            {
                "type": "registration_confirmation",
                "sentAt": "2026-05-20T14:10:00.000Z",
                "channel": "email",
                "status": "delivered"
            }
        ],
        "feedbackSubmitted": false,
        "rating": null,
        "reviewId": null,
        "metadata": {
            "ipAddress": "103.255.10.22",
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
            "deviceType": "desktop"
        },
        "createdAt": "2026-05-20T14:00:00.000Z",
        "updatedAt": "2026-06-12T17:00:00.000Z",
        "cancelledAt": null
    },
    {
        "registrationId": "REG005",
        "eventId": "evt_001",
        "userId": "U004",
        "organizerId": "org_001",
        "registrationDate": "2026-06-05T11:20:00.000Z",
        "registrationSource": "mobile_app",
        "status": "confirmed",
        "statusHistory": [
            { "status": "pending", "timestamp": "2026-06-05T11:20:00.000Z" },
            { "status": "confirmed", "timestamp": "2026-06-05T11:25:00.000Z" }
        ],
        "payment": {
            "paymentId": "PAY089",
            "amountPaid": 2500,
            "currency": "PKR",
            "paymentMethod": "credit_card",
            "paymentStatus": "completed",
            "transactionId": "STRIPE_ch_998877",
            "invoiceUrl": "https://storage.events.com/invoices/INV089.pdf"
        },
        "pricingTier": "Standard",
        "finalPrice": 2500,
        "discountApplied": null,
        "checkIn": {
            "checkedIn": false,
            "checkInTime": null,
            "checkInMethod": null,
            "checkedInBy": null,
            "deviceId": null
        },
        "qrCode": {
            "data": "evt_001_U004_REG005",
            "imageUrl": "https://storage.events.com/qrcodes/qr_evt_001_U004.png",
            "scanCount": 0,
            "lastScanned": null
        },
        "certificate": {
            "issued": false,
            "certificateId": null,
            "issueDate": null,
            "downloadUrl": null,
            "sharedOnLinkedIn": false
        },
        "communications": [
            {
                "type": "registration_confirmation",
                "sentAt": "2026-06-05T11:25:00.000Z",
                "channel": "email",
                "status": "delivered"
            }
        ],
        "feedbackSubmitted": false,
        "rating": null,
        "reviewId": null,
        "metadata": {
            "ipAddress": "182.176.44.55",
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
            "deviceType": "mobile"
        },
        "createdAt": "2026-06-05T11:20:00.000Z",
        "updatedAt": "2026-06-05T11:25:00.000Z",
        "cancelledAt": null
    },
    {
        "registrationId": "REG006",
        "eventId": "evt_001",
        "userId": "U005",
        "organizerId": "org_001",
        "registrationDate": "2026-06-10T16:00:00.000Z",
        "registrationSource": "web",
        "status": "pending",
        "statusHistory": [
            { "status": "pending", "timestamp": "2026-06-10T16:00:00.000Z" }
        ],
        "payment": {
            "paymentId": "PAY112",
            "amountPaid": 0,
            "currency": "PKR",
            "paymentMethod": "bank_transfer",
            "paymentStatus": "pending",
            "transactionId": null,
            "invoiceUrl": null
        },
        "pricingTier": "Standard",
        "finalPrice": 2500,
        "discountApplied": null,
        "checkIn": {
            "checkedIn": false,
            "checkInTime": null,
            "checkInMethod": null,
            "checkedInBy": null,
            "deviceId": null
        },
        "qrCode": {
            "data": "evt_001_U005_REG006",
            "imageUrl": "https://storage.events.com/qrcodes/qr_evt_001_U005.png",
            "scanCount": 0,
            "lastScanned": null
        },
        "certificate": {
            "issued": false,
            "certificateId": null,
            "issueDate": null,
            "downloadUrl": null,
            "sharedOnLinkedIn": false
        },
        "communications": [
            {
                "type": "payment_reminder",
                "sentAt": "2026-06-12T10:00:00.000Z",
                "channel": "email",
                "status": "delivered"
            }
        ],
        "feedbackSubmitted": false,
        "rating": null,
        "reviewId": null,
        "metadata": {
            "ipAddress": "202.163.76.12",
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15)",
            "deviceType": "desktop"
        },
        "createdAt": "2026-06-10T16:00:00.000Z",
        "updatedAt": "2026-06-10T16:00:00.000Z",
        "cancelledAt": null
    }
]