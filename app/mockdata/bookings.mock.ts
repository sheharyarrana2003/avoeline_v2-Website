export const mockBookings= [
  {
    "bookingId": "B001",
    "eventId": "evt_001",
    "vendorId": "V001",
    "organizerId": "org_001",
    "serviceType": "catering",
    "serviceId": "SERV001",
    "requirements": {
      "description": "Lunch and high-tea for 200 Hackathon participants",
      "serviceDate": "2026-06-12",
      "startTime": "13:00",
      "endTime": "18:00",
      "location": "FAST-NUCES Main Campus, Lahore",
      "specialInstructions": "Include 20 vegetarian and 10 gluten-free meals.",
      "guestCount": 200
    },
    "quote": {
      "requestedAt": "2026-05-01T10:00:00Z",
      "respondedAt": "2026-05-02T14:30:00Z",
      "vendorQuote": {
        "basePrice": 300000,
        "additionalCharges": [
          { "description": "Special dietary meals prep", "amount": 15000 },
          { "description": "Extended service hours staff", "amount": 25000 }
        ],
        "discount": 20000,
        "totalAmount": 320000,
        "breakdown": [
          { "item": "Standard Lunch Box", "quantity": 170, "unitPrice": 1200, "total": 204000 },
          { "item": "Special Diet Box", "quantity": 30, "unitPrice": 1500, "total": 45000 },
          { "item": "High Tea Spread", "quantity": 200, "unitPrice": 255, "total": 51000 }
        ],
        "terms": "50% advance to confirm booking, 50% on event day morning.",
        "validity": "2026-05-15T00:00:00Z"
      },
      "negotiation": [
        {
          "from": "organizer",
          "message": "Can we waive the dietary meals prep charge since we are a university event?",
          "timestamp": "2026-05-03T09:15:00Z"
        },
        {
          "from": "vendor",
          "message": "We can reduce it to 5000, but cannot waive it completely due to separate kitchen requirements.",
          "timestamp": "2026-05-03T11:00:00Z"
        }
      ]
    },
    "status": "completed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-05-01T10:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-05-02T14:30:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-05-04T10:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-05-05T09:00:00Z" },
      { "status": "in_progress", "timestamp": "2026-06-12T10:00:00Z" },
      { "status": "completed", "timestamp": "2026-06-12T20:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "org_001",
      "signedByVendor": "V001",
      "signedAt": "2026-05-04T15:30:00Z",
      "contractUrl": "https://storage.events.com/contracts/B001.pdf",
      "terms": {
        "cancellationPolicy": "Full refund if cancelled 14 days prior; 50% within 7 days.",
        "liability": "Vendor holds valid food authority license."
      }
    },
    "payment": {
      "totalAmount": 310000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Advance",
          "amount": 155000,
          "dueDate": "2026-05-05T00:00:00Z",
          "status": "paid",
          "paymentId": "PAY_ADV_001"
        },
        {
          "installment": "Final",
          "amount": 155000,
          "dueDate": "2026-06-12T00:00:00Z",
          "status": "paid",
          "paymentId": "PAY_FIN_001"
        }
      ],
      "commission": {
        "platformCommission": 31000,
        "platformCommissionPercentage": 10,
        "vendorReceives": 279000
      }
    },
    "delivery": {
      "scheduledDate": "2026-06-12",
      "scheduledTime": "12:00",
      "actualDeliveryTime": "11:45",
      "deliveryNotes": "Arrived early, setup completed in hall B.",
      "setupCompleted": true,
      "teardownCompleted": true
    },
    "qualityCheck": {
      "organizerCheck": {
        "checked": true,
        "rating": 5,
        "comments": "Excellent food quality, dietary boxes were clearly labeled.",
        "checkedAt": "2026-06-12T19:00:00Z"
      },
      "vendorSelfCheck": {
        "completed": true,
        "report": "All stations managed smoothly. No food shortages."
      }
    },
    "communications": [
      {
        "type": "quote_request",
        "from": "organizer",
        "to": "vendor",
        "message": "Looking for lunch and high tea for our annual hackathon.",
        "timestamp": "2026-05-01T10:00:00Z"
      }
    ],
    "documents": {
      "quotePdf": "https://storage.events.com/quotes/B001_quote.pdf",
      "invoicePdf": "https://storage.events.com/invoices/B001_invoice.pdf",
      "receiptPdf": "https://storage.events.com/receipts/B001_receipt.pdf"
    },
    "review": {
      "organizerReviewId": "REV_B001_ORG",
      "vendorReviewId": "REV_B001_VEN",
      "organizerRating": 5,
      "vendorRating": 4
    },
    "createdAt": "2026-05-01T10:00:00Z",
    "updatedAt": "2026-06-13T09:00:00Z",
    "confirmedAt": "2026-05-05T09:00:00Z",
    "completedAt": "2026-06-12T20:00:00Z",
    "cancelledAt": null
  },
  {
    "bookingId": "B002",
    "eventId": "evt_001",
    "vendorId": "V005",
    "organizerId": "org_001",
    "serviceType": "av_equipment",
    "serviceId": "SERV_AV_102",
    "requirements": {
      "description": "Projectors, PA system, and mics for Keynote and 3 side panels",
      "serviceDate": "2026-06-12",
      "startTime": "08:00",
      "endTime": "18:00",
      "location": "FAST-NUCES Main Campus, Lahore",
      "specialInstructions": "Need on-site technician for the full duration.",
      "guestCount": 0
    },
    "quote": {
      "requestedAt": "2026-05-10T11:00:00Z",
      "respondedAt": "2026-05-11T09:30:00Z",
      "vendorQuote": {
        "basePrice": 85000,
        "additionalCharges": [
          { "description": "Full-day onsite technician", "amount": 15000 }
        ],
        "discount": 5000,
        "totalAmount": 95000,
        "breakdown": [
          { "item": "Main Hall PA System", "quantity": 1, "unitPrice": 40000, "total": 40000 },
          { "item": "Classroom Projector Kit", "quantity": 3, "unitPrice": 15000, "total": 45000 }
        ],
        "terms": "100% advance payment via bank transfer.",
        "validity": "2026-05-20T00:00:00Z"
      },
      "negotiation": []
    },
    "status": "confirmed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-05-10T11:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-05-11T09:30:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-05-12T14:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-05-13T10:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "org_001",
      "signedByVendor": "V005",
      "signedAt": "2026-05-12T15:00:00Z",
      "contractUrl": "https://storage.events.com/contracts/B002.pdf",
      "terms": {
        "cancellationPolicy": "No refunds within 48 hours.",
        "liability": "Organizer responsible for physical damage to equipment."
      }
    },
    "payment": {
      "totalAmount": 95000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Full Payment",
          "amount": 95000,
          "dueDate": "2026-05-13T00:00:00Z",
          "status": "paid",
          "paymentId": "PAY_FULL_002"
        }
      ],
      "commission": {
        "platformCommission": 9500,
        "platformCommissionPercentage": 10,
        "vendorReceives": 85500
      }
    },
    "delivery": {
      "scheduledDate": "2026-06-12",
      "scheduledTime": "07:00",
      "actualDeliveryTime": null,
      "deliveryNotes": "Pending delivery",
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": null
    },
    "communications": [
      {
        "type": "quote_request",
        "from": "organizer",
        "to": "vendor",
        "message": "We need robust AV for the Techverse Hackathon.",
        "timestamp": "2026-05-10T11:00:00Z"
      }
    ],
    "documents": {
      "quotePdf": "https://storage.events.com/quotes/B002_quote.pdf",
      "invoicePdf": "https://storage.events.com/invoices/B002_invoice.pdf",
      "receiptPdf": "https://storage.events.com/receipts/B002_receipt.pdf"
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-05-10T11:00:00Z",
    "updatedAt": "2026-05-13T10:00:00Z",
    "confirmedAt": "2026-05-13T10:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  }
]