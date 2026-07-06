export const mockBookings = [
 {
    "bookingId": "B_001_REQ",
    "eventId": "E_CATERING_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "Catering",
    "serviceId": "S_BUFFET_PREMIUM",
    "requirements": {
      "description": "Premium Buffet Catering for Corporate Gala",
      "serviceDate": "2026-08-15",
      "startTime": "18:00",
      "endTime": "22:00",
      "location": "Grand Ballroom, Downtown Hotel",
      "specialInstructions": "Require 3 vegan and 2 gluten-free options clearly labeled.",
      "guestCount": 150
    },
    "quote": {
      "requestedAt": "2026-07-06T10:00:00Z",
      "respondedAt": null,
      "vendorQuote": null,
      "negotiation": [
        {
          "from": "organizer",
          "message": "Hi, looking forward to your quote. Please include live pasta counter options.",
          "timestamp": "2026-07-06T10:05:00Z"
        }
      ]
    },
    "status": "quote_requested",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-07-06T10:00:00Z"
      }
    ],
    "contract": {
      "signed": false,
      "signedByOrganizer": null,
      "signedByVendor": null,
      "signedAt": null,
      "contractUrl": null,
      "terms": {
        "cancellationPolicy": "Standard 48-hour cancellation policy applies.",
        "liability": "Vendor is not liable for structural venue restrictions."
      }
    },
    "payment": {
      "totalAmount": 0,
      "currency": "USD",
      "paymentSchedule": [],
      "commission": {
        "platformCommission": 0,
        "platformCommissionPercentage": 10,
        "vendorReceives": 0
      }
    },
    "delivery": {
      "scheduledDate": "2026-08-15",
      "scheduledTime": "16:00",
      "actualDeliveryTime": null,
      "deliveryNotes": null,
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": null
    },
    "communications": [
      {
        "type": "chat",
        "from": "organizer",
        "to": "vendor",
        "message": "Hi, looking forward to your quote. Please include live pasta counter options.",
        "timestamp": "2026-07-06T10:05:00Z"
      }
    ],
    "documents": {
      "quotePdf": null,
      "invoicePdf": null,
      "receiptPdf": null
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-07-06T10:00:00Z",
    "updatedAt": "2026-07-06T10:05:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_002_SENT",
    "eventId": "E_LIGHTING_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "AV & Lighting",
    "serviceId": "S_STAGE_LIGHTS_04",
    "requirements": {
      "description": "Stage Lighting and Sound Systems for Concert",
      "serviceDate": "2026-09-20",
      "startTime": "14:00",
      "endTime": "23:00",
      "location": "City Amphitheater",
      "specialInstructions": "Outdoor setup, needs weatherproofing.",
      "guestCount": 500
    },
    "quote": {
      "requestedAt": "2026-07-05T09:00:00Z",
      "respondedAt": "2026-07-06T14:30:00Z",
      "vendorQuote": {
        "basePrice": 3500,
        "additionalCharges": [
          {
            "description": "Outdoor Weatherproofing Cover Surcharge",
            "amount": 250
          }
        ],
        "discount": 150,
        "totalAmount": 3600,
        "breakdown": [
          {
            "item": "Base Stage Audio/Visual Setup",
            "quantity": 1,
            "unitPrice": 3500,
            "total": 3500
          },
          {
            "item": "Weather Wraps",
            "quantity": 5,
            "unitPrice": 50,
            "total": 250
          }
        ],
        "terms": "Valid for 14 days. Requires 50% deposit to secure booking date.",
        "validity": "2026-07-20T23:59:59Z"
      },
      "negotiation": [
        {
          "from": "organizer",
          "message": "Can we get a small discount since we are long-term clients?",
          "timestamp": "2026-07-05T11:00:00Z"
        },
        {
          "from": "vendor",
          "message": "Applied a $150 loyalty discount to the breakdown.",
          "timestamp": "2026-07-06T14:28:00Z"
        }
      ]
    },
    "status": "quote_sent",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-07-05T09:00:00Z"
      },
      {
        "status": "quote_sent",
        "timestamp": "2026-07-06T14:30:00Z"
      }
    ],
    "contract": {
      "signed": false,
      "signedByOrganizer": null,
      "signedByVendor": null,
      "signedAt": null,
      "contractUrl": "https://cdn.platform.com/contracts/draft_B_002.pdf",
      "terms": {
        "cancellationPolicy": "50% non-refundable deposit if cancelled within 30 days of the event.",
        "liability": "Vendor is not responsible for power outages caused by municipal grid failures."
      }
    },
    "payment": {
      "totalAmount": 3600,
      "currency": "USD",
      "paymentSchedule": [
        {
          "installment": "Deposit",
          "amount": 1800,
          "dueDate": "2026-07-20",
          "status": "pending",
          "paymentId": null
        },
        {
          "installment": "Final Balance",
          "amount": 1800,
          "dueDate": "2026-09-06",
          "status": "pending",
          "paymentId": null
        }
      ],
      "commission": {
        "platformCommission": 360,
        "platformCommissionPercentage": 10,
        "vendorReceives": 3240
      }
    },
    "delivery": {
      "scheduledDate": "2026-09-20",
      "scheduledTime": "10:00",
      "actualDeliveryTime": null,
      "deliveryNotes": "Access through Gate 4 for loading dock.",
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": null
    },
    "communications": [],
    "documents": {
      "quotePdf": "https://cdn.platform.com/quotes/Q_B_002.pdf",
      "invoicePdf": null,
      "receiptPdf": null
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-07-05T09:00:00Z",
    "updatedAt": "2026-07-06T14:30:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_003_ACCEPTED",
    "eventId": "E_DECOR_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "Decoration",
    "serviceId": "S_FLORAL_BACKDROP",
    "requirements": {
      "description": "Floral backdrops and table centerpieces",
      "serviceDate": "2026-10-05",
      "startTime": "09:00",
      "endTime": "17:00",
      "location": "Plaza Reception Hall",
      "specialInstructions": "White and pastel roses mostly.",
      "guestCount": 200
    },
    "quote": {
      "requestedAt": "2026-07-01T12:00:00Z",
      "respondedAt": "2026-07-02T10:00:00Z",
      "vendorQuote": {
        "basePrice": 1500,
        "additionalCharges": [],
        "discount": 0,
        "totalAmount": 1500,
        "breakdown": [
          {
            "item": "Premium Backdrop Setup",
            "quantity": 1,
            "unitPrice": 1000,
            "total": 1000
          },
          {
            "item": "Table Floral Pots",
            "quantity": 20,
            "unitPrice": 25,
            "total": 500
          }
        ],
        "terms": "Acceptance locks inventory pricing.",
        "validity": "2026-07-15T00:00:00Z"
      },
      "negotiation": []
    },
    "status": "quote_accepted",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-07-01T12:00:00Z"
      },
      {
        "status": "quote_sent",
        "timestamp": "2026-07-02T10:00:00Z"
      },
      {
        "status": "quote_accepted",
        "timestamp": "2026-07-06T15:00:00Z"
      }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
      "signedAt": "2026-07-06T15:15:00Z",
      "contractUrl": "https://cdn.platform.com/contracts/executed_B_003.pdf",
      "terms": {
        "cancellationPolicy": "Full refund if cancelled 60 days before.",
        "liability": "Standard accidental florist damage waiver."
      }
    },
    "payment": {
      "totalAmount": 1500,
      "currency": "USD",
      "paymentSchedule": [
        {
          "installment": "Full Amount",
          "amount": 1500,
          "dueDate": "2026-07-10",
          "status": "pending",
          "paymentId": null
        }
      ],
      "commission": {
        "platformCommission": 150,
        "platformCommissionPercentage": 10,
        "vendorReceives": 1350
      }
    },
    "delivery": {
      "scheduledDate": "2026-10-05",
      "scheduledTime": "06:00",
      "actualDeliveryTime": null,
      "deliveryNotes": "Deliver straight to front room staging area.",
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": null
    },
    "communications": [],
    "documents": {
      "quotePdf": "https://cdn.platform.com/quotes/Q_B_003.pdf",
      "invoicePdf": "https://cdn.platform.com/invoices/INV_B_003.pdf",
      "receiptPdf": null
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-07-01T12:00:00Z",
    "updatedAt": "2026-07-06T15:15:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_004_CONFIRMED",
    "eventId": "E_PHOTO_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "Photography",
    "serviceId": "S_HD_VIDEOGRAPHY_PACKAGE",
    "requirements": {
      "description": "Event Photography and Videography Coverage",
      "serviceDate": "2026-07-25",
      "startTime": "10:00",
      "endTime": "18:00",
      "location": "Convention Center Hall B",
      "specialInstructions": "Deliver raw files on SSD.",
      "guestCount": 350
    },
    "quote": {
      "requestedAt": "2026-06-15T14:00:00Z",
      "respondedAt": "2026-06-16T09:00:00Z",
      "vendorQuote": {
        "basePrice": 2000,
        "additionalCharges": [],
        "discount": 0,
        "totalAmount": 2000,
        "breakdown": [
          {
            "item": "Full Day Video & Photo Package",
            "quantity": 1,
            "unitPrice": 2000,
            "total": 2000
          }
        ],
        "terms": "Confirmed status finalized upon payment confirmation.",
        "validity": "2026-06-30T00:00:00Z"
      },
      "negotiation": []
    },
    "status": "confirmed",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-06-15T14:00:00Z"
      },
      {
        "status": "quote_sent",
        "timestamp": "2026-06-16T09:00:00Z"
      },
      {
        "status": "quote_accepted",
        "timestamp": "2026-06-18T11:00:00Z"
      },
      {
        "status": "confirmed",
        "timestamp": "2026-06-18T12:30:00Z"
      }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
      "signedAt": "2026-06-18T11:05:00Z",
      "contractUrl": "https://cdn.platform.com/contracts/executed_B_004.pdf",
      "terms": {
        "cancellationPolicy": "Non-refundable after confirm state.",
        "liability": "Media replacement value capping if assets corrupted."
      }
    },
    "payment": {
      "totalAmount": 2000,
      "currency": "USD",
      "paymentSchedule": [
        {
          "installment": "Deposit 100%",
          "amount": 2000,
          "dueDate": "2026-06-18",
          "status": "paid",
          "paymentId": "PAY_TXN_99821_XYZ"
        }
      ],
      "commission": {
        "platformCommission": 200,
        "platformCommissionPercentage": 10,
        "vendorReceives": 1800
      }
    },
    "delivery": {
      "scheduledDate": "2026-07-25",
      "scheduledTime": "09:30",
      "actualDeliveryTime": null,
      "deliveryNotes": "Arrive 30 mins early for camera sound check.",
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": null
    },
    "communications": [],
    "documents": {
      "quotePdf": "https://cdn.platform.com/quotes/Q_B_004.pdf",
      "invoicePdf": "https://cdn.platform.com/invoices/INV_B_004.pdf",
      "receiptPdf": "https://cdn.platform.com/receipts/REC_B_004.pdf"
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-06-15T14:00:00Z",
    "updatedAt": "2026-06-18T12:30:00Z",
    "confirmedAt": "2026-06-18T12:30:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_005_IN_PROGRESS",
    "eventId": "E_STAGE_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "Stage Setup",
    "serviceId": "S_PRO_STAGE_XL",
    "requirements": {
      "description": "Main Event Stage Construction",
      "serviceDate": "2026-07-06",
      "startTime": "08:00",
      "endTime": "20:00",
      "location": "Exhibition Arena, Shed 3",
      "specialInstructions": "Requires high-grade security clearances for crew.",
      "guestCount": 1000
    },
    "quote": {
      "requestedAt": "2026-06-01T08:00:00Z",
      "respondedAt": "2026-06-02T13:00:00Z",
      "vendorQuote": {
        "basePrice": 5000,
        "additionalCharges": [],
        "discount": 0,
        "totalAmount": 5000,
        "breakdown": [
          {
            "item": "Modular Scaffolding Stage Construction",
            "quantity": 1,
            "unitPrice": 5000,
            "total": 5000
          }
        ],
        "terms": "Standard full execution terms apply.",
        "validity": "2026-06-15T00:00:00Z"
      },
      "negotiation": []
    },
    "status": "in_progress",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-06-01T08:00:00Z"
      },
      {
        "status": "quote_sent",
        "timestamp": "2026-06-02T13:00:00Z"
      },
      {
        "status": "quote_accepted",
        "timestamp": "2026-06-05T09:00:00Z"
      },
      {
        "status": "confirmed",
        "timestamp": "2026-06-05T10:00:00Z"
      },
      {
        "status": "in_progress",
        "timestamp": "2026-07-06T08:00:00Z"
      }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
      "signedAt": "2026-06-05T09:00:00Z",
      "contractUrl": "https://cdn.platform.com/contracts/executed_B_005.pdf",
      "terms": {
        "cancellationPolicy": "Non-refundable after installation starts.",
        "liability": "Full structural safety certification provided by vendor."
      }
    },
    "payment": {
      "totalAmount": 5000,
      "currency": "USD",
      "paymentSchedule": [
        {
          "installment": "Deposit 50%",
          "amount": 2500,
          "dueDate": "2026-06-05",
          "status": "paid",
          "paymentId": "PAY_TXN_11223"
        },
        {
          "installment": "Post Event Final 50%",
          "amount": 2500,
          "dueDate": "2026-07-07",
          "status": "pending",
          "paymentId": null
        }
      ],
      "commission": {
        "platformCommission": 500,
        "platformCommissionPercentage": 10,
        "vendorReceives": 4500
      }
    },
    "delivery": {
      "scheduledDate": "2026-07-06",
      "scheduledTime": "07:30",
      "actualDeliveryTime": "2026-07-06T07:45:00Z",
      "deliveryNotes": "Crew arrived on time. Currently setting up trusses.",
      "setupCompleted": true,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": {
        "completed": true,
        "report": "Initial staging build leveled and structurally confirmed solid."
      }
    },
    "communications": [
      {
        "type": "system",
        "from": "system",
        "to": "organizer",
        "message": "Vendor check-in event logged: setup completed at the venue.",
        "timestamp": "2026-07-06T11:00:00Z"
      }
    ],
    "documents": {
      "quotePdf": "https://cdn.platform.com/quotes/Q_B_005.pdf",
      "invoicePdf": "https://cdn.platform.com/invoices/INV_B_005.pdf",
      "receiptPdf": null
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-06-01T08:00:00Z",
    "updatedAt": "2026-07-06T11:00:00Z",
    "confirmedAt": "2026-06-05T10:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_006_COMPLETED",
    "eventId": "E_CONFERENCE_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "Audio Engineering",
    "serviceId": "S_MIC_SOUND_SYSTEM_01",
    "requirements": {
      "description": "Wireless Mic Sets & Operator for Panel Discussion",
      "serviceDate": "2026-06-20",
      "startTime": "09:00",
      "endTime": "13:00",
      "location": "Hotel Seminar Hall A",
      "specialInstructions": "Requires 6 clip-on lapel mics.",
      "guestCount": 80
    },
    "quote": {
      "requestedAt": "2026-05-10T10:00:00Z",
      "respondedAt": "2026-05-11T12:00:00Z",
      "vendorQuote": {
        "basePrice": 800,
        "additionalCharges": [],
        "discount": 0,
        "totalAmount": 800,
        "breakdown": [
          {
            "item": "Audio System and Engineer Block",
            "quantity": 1,
            "unitPrice": 800,
            "total": 800
          }
        ],
        "terms": "Full completion validation checklist applies.",
        "validity": "2026-05-25T00:00:00Z"
      },
      "negotiation": []
    },
    "status": "completed",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-05-10T10:00:00Z"
      },
      {
        "status": "quote_sent",
        "timestamp": "2026-05-11T12:00:00Z"
      },
      {
        "status": "quote_accepted",
        "timestamp": "2026-05-14T09:00:00Z"
      },
      {
        "status": "confirmed",
        "timestamp": "2026-05-14T10:00:00Z"
      },
      {
        "status": "in_progress",
        "timestamp": "2026-06-20T09:00:00Z"
      },
      {
        "status": "completed",
        "timestamp": "2026-06-20T14:30:00Z"
      }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
      "signedAt": "2026-05-14T09:05:00Z",
      "contractUrl": "https://cdn.platform.com/contracts/executed_B_006.pdf",
      "terms": {
        "cancellationPolicy": "Standard cancellation rules.",
        "liability": "Limited to replacement of technical components."
      }
    },
    "payment": {
      "totalAmount": 800,
      "currency": "USD",
      "paymentSchedule": [
        {
          "installment": "Total Payment",
          "amount": 800,
          "dueDate": "2026-05-14",
          "status": "paid",
          "paymentId": "PAY_TXN_55431"
        }
      ],
      "commission": {
        "platformCommission": 80,
        "platformCommissionPercentage": 10,
        "vendorReceives": 720
      }
    },
    "delivery": {
      "scheduledDate": "2026-06-20",
      "scheduledTime": "08:00",
      "actualDeliveryTime": "2026-06-20T08:02:00Z",
      "deliveryNotes": "Flawless technical layout execution. Timely pullout.",
      "setupCompleted": true,
      "teardownCompleted": true
    },
    "qualityCheck": {
      "organizerCheck": {
        "checked": true,
        "rating": 5,
        "comments": "Sound engineer was incredibly precise. Highly recommended!",
        "checkedAt": "2026-06-20T14:00:00Z"
      },
      "vendorSelfCheck": {
        "completed": true,
        "report": "All elements delivered fully safely back to warehouse storage."
      }
    },
    "communications": [],
    "documents": {
      "quotePdf": "https://cdn.platform.com/quotes/Q_B_006.pdf",
      "invoicePdf": "https://cdn.platform.com/invoices/INV_B_006.pdf",
      "receiptPdf": "https://cdn.platform.com/receipts/REC_B_006.pdf"
    },
    "review": {
      "organizerReviewId": "REV_ORG_006",
      "vendorReviewId": "REV_VND_006",
      "organizerRating": 5,
      "vendorRating": 5
    },
    "createdAt": "2026-05-10T10:00:00Z",
    "updatedAt": "2026-06-20T14:30:00Z",
    "confirmedAt": "2026-05-14T10:00:00Z",
    "completedAt": "2026-06-20T14:30:00Z",
    "cancelledAt": null
  },
  {
    "bookingId": "B_007_CANCELLED",
    "eventId": "E_FESTIVAL_2026",
    "vendorId": "V_xf0HloVnJNQRUZMDcEWuUYw4wJ02",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "Tent Rental",
    "serviceId": "S_CANOPY_GIANT",
    "requirements": {
      "description": "Outdoor Waterproof Canopies",
      "serviceDate": "2026-11-01",
      "startTime": "06:00",
      "endTime": "18:00",
      "location": "North Field Park",
      "specialInstructions": "Anchors required for severe wind protection.",
      "guestCount": 1200
    },
    "quote": {
      "requestedAt": "2026-06-10T09:00:00Z",
      "respondedAt": "2026-06-11T15:00:00Z",
      "vendorQuote": {
        "basePrice": 4000,
        "additionalCharges": [],
        "discount": 0,
        "totalAmount": 4000,
        "breakdown": [
          {
            "item": "Mega Pavilion Canopy Structure",
            "quantity": 1,
            "unitPrice": 4000,
            "total": 4000
          }
        ],
        "terms": "Standard cancellation fee terms applicable.",
        "validity": "2026-06-25T00:00:00Z"
      },
      "negotiation": []
    },
    "status": "cancelled",
    "statusHistory": [
      {
        "status": "quote_requested",
        "timestamp": "2026-06-10T09:00:00Z"
      },
      {
        "status": "quote_sent",
        "timestamp": "2026-06-11T15:00:00Z"
      },
      {
        "status": "cancelled",
        "timestamp": "2026-06-15T16:20:00Z"
      }
    ],
    "contract": {
      "signed": false,
      "signedByOrganizer": null,
      "signedByVendor": null,
      "signedAt": null,
      "contractUrl": null,
      "terms": {
        "cancellationPolicy": "Free cancel before booking confirmation.",
        "liability": "None incurred."
      }
    },
    "payment": {
      "totalAmount": 4000,
      "currency": "USD",
      "paymentSchedule": [],
      "commission": {
        "platformCommission": 400,
        "platformCommissionPercentage": 10,
        "vendorReceives": 3600
      }
    },
    "delivery": {
      "scheduledDate": "2026-11-01",
      "scheduledTime": "04:00",
      "actualDeliveryTime": null,
      "deliveryNotes": null,
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {
      "organizerCheck": null,
      "vendorSelfCheck": null
    },
    "communications": [
      {
        "type": "chat",
        "from": "organizer",
        "to": "vendor",
        "message": "Apologies, the city permit for the festival layout was denied, so we must cancel this quote request.",
        "timestamp": "2026-06-15T16:18:00Z"
      }
    ],
    "documents": {
      "quotePdf": "https://cdn.platform.com/quotes/Q_B_007.pdf",
      "invoicePdf": null,
      "receiptPdf": null
    },
    "review": {
      "organizerReviewId": null,
      "vendorReviewId": null,
      "organizerRating": null,
      "vendorRating": null
    },
    "createdAt": "2026-06-10T09:00:00Z",
    "updatedAt": "2026-06-15T16:20:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": "2026-06-15T16:20:00Z"
  }, {
    bookingId: "B001",
    eventId: "evt_001",
    vendorId: "V001",
    organizerId: "org_001",
    serviceType: "catering",
    serviceId: "SERV001",
    requirements: {
      description: "Lunch and high-tea for 200 Hackathon participants",
      serviceDate: "2026-06-12",
      startTime: "13:00",
      endTime: "18:00",
      location: "FAST-NUCES Main Campus, Lahore",
      specialInstructions: "Include 20 vegetarian and 10 gluten-free meals.",
      guestCount: 200,
    },
    quote: {
      requestedAt: "2026-05-01T10:00:00Z",
      respondedAt: "2026-05-02T14:30:00Z",
      vendorQuote: {
        basePrice: 300000,
        additionalCharges: [
          { description: "Special dietary meals prep", amount: 15000 },
          { description: "Extended service hours staff", amount: 25000 },
        ],
        discount: 20000,
        totalAmount: 320000,
        breakdown: [
          {
            item: "Standard Lunch Box",
            quantity: 170,
            unitPrice: 1200,
            total: 204000,
          },
          {
            item: "Special Diet Box",
            quantity: 30,
            unitPrice: 1500,
            total: 45000,
          },
          {
            item: "High Tea Spread",
            quantity: 200,
            unitPrice: 255,
            total: 51000,
          },
        ],
        terms: "50% advance to confirm booking, 50% on event day morning.",
        validity: "2026-05-15T00:00:00Z",
      },
      negotiation: [
        {
          from: "organizer",
          message:
            "Can we waive the dietary meals prep charge since we are a university event?",
          timestamp: "2026-05-03T09:15:00Z",
        },
        {
          from: "vendor",
          message:
            "We can reduce it to 5000, but cannot waive it completely due to separate kitchen requirements.",
          timestamp: "2026-05-03T11:00:00Z",
        },
      ],
    },
    status: "completed",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-05-01T10:00:00Z" },
      { status: "quote_sent", timestamp: "2026-05-02T14:30:00Z" },
      { status: "quote_accepted", timestamp: "2026-05-04T10:00:00Z" },
      { status: "confirmed", timestamp: "2026-05-05T09:00:00Z" },
      { status: "in_progress", timestamp: "2026-06-12T10:00:00Z" },
      { status: "completed", timestamp: "2026-06-12T20:00:00Z" },
    ],
    contract: {
      signed: true,
      signedByOrganizer: "org_001",
      signedByVendor: "V001",
      signedAt: "2026-05-04T15:30:00Z",
      contractUrl: "https://storage.events.com/contracts/B001.pdf",
      terms: {
        cancellationPolicy:
          "Full refund if cancelled 14 days prior; 50% within 7 days.",
        liability: "Vendor holds valid food authority license.",
      },
    },
    payment: {
      totalAmount: 310000,
      currency: "PKR",
      paymentSchedule: [
        {
          installment: "Advance",
          amount: 155000,
          dueDate: "2026-05-05T00:00:00Z",
          status: "paid",
          paymentId: "PAY_ADV_001",
        },
        {
          installment: "Final",
          amount: 155000,
          dueDate: "2026-06-12T00:00:00Z",
          status: "paid",
          paymentId: "PAY_FIN_001",
        },
      ],
      commission: {
        platformCommission: 31000,
        platformCommissionPercentage: 10,
        vendorReceives: 279000,
      },
    },
    delivery: {
      scheduledDate: "2026-06-12",
      scheduledTime: "12:00",
      actualDeliveryTime: "11:45",
      deliveryNotes: "Arrived early, setup completed in hall B.",
      setupCompleted: true,
      teardownCompleted: true,
    },
    qualityCheck: {
      organizerCheck: {
        checked: true,
        rating: 5,
        comments: "Excellent food quality, dietary boxes were clearly labeled.",
        checkedAt: "2026-06-12T19:00:00Z",
      },
      vendorSelfCheck: {
        completed: true,
        report: "All stations managed smoothly. No food shortages.",
      },
    },
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message: "Looking for lunch and high tea for our annual hackathon.",
        timestamp: "2026-05-01T10:00:00Z",
      },
      {
        "type": "quote_request",
        "from": "vendor",
        "to": "organzer",
        "message": "Got itt",
        "timestamp": "2026-05-01T10:00:00Z"
      }
    ],
    documents: {
      quotePdf: "https://storage.events.com/quotes/B001_quote.pdf",
      invoicePdf: "https://storage.events.com/invoices/B001_invoice.pdf",
      receiptPdf: "https://storage.events.com/receipts/B001_receipt.pdf",
    },
    review: {
      organizerReviewId: "REV_B001_ORG",
      vendorReviewId: "REV_B001_VEN",
      organizerRating: 5,
      vendorRating: 4,
    },
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-06-13T09:00:00Z",
    confirmedAt: "2026-05-05T09:00:00Z",
    completedAt: "2026-06-12T20:00:00Z",
    cancelledAt: null,
  },
  {
    bookingId: "B002",
    eventId: "evt_001",
    vendorId: "V005",
    organizerId: "org_001",
    serviceType: "av_equipment",
    serviceId: "SERV_AV_102",
    requirements: {
      description:
        "Projectors, PA system, and mics for Keynote and 3 side panels",
      serviceDate: "2026-06-12",
      startTime: "08:00",
      endTime: "18:00",
      location: "FAST-NUCES Main Campus, Lahore",
      specialInstructions: "Need on-site technician for the full duration.",
      guestCount: 0,
    },
    quote: {
      requestedAt: "2026-05-10T11:00:00Z",
      respondedAt: "2026-05-11T09:30:00Z",
      vendorQuote: {
        basePrice: 85000,
        additionalCharges: [
          { description: "Full-day onsite technician", amount: 15000 },
        ],
        discount: 5000,
        totalAmount: 95000,
        breakdown: [
          {
            item: "Main Hall PA System",
            quantity: 1,
            unitPrice: 40000,
            total: 40000,
          },
          {
            item: "Classroom Projector Kit",
            quantity: 3,
            unitPrice: 15000,
            total: 45000,
          },
        ],
        terms: "100% advance payment via bank transfer.",
        validity: "2026-05-20T00:00:00Z",
      },
      negotiation: [],
    },
    status: "confirmed",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-05-10T11:00:00Z" },
      { status: "quote_sent", timestamp: "2026-05-11T09:30:00Z" },
      { status: "quote_accepted", timestamp: "2026-05-12T14:00:00Z" },
      { status: "confirmed", timestamp: "2026-05-13T10:00:00Z" },
    ],
    contract: {
      signed: true,
      signedByOrganizer: "org_001",
      signedByVendor: "V005",
      signedAt: "2026-05-12T15:00:00Z",
      contractUrl: "https://storage.events.com/contracts/B002.pdf",
      terms: {
        cancellationPolicy: "No refunds within 48 hours.",
        liability: "Organizer responsible for physical damage to equipment.",
      },
    },
    payment: {
      totalAmount: 95000,
      currency: "PKR",
      paymentSchedule: [
        {
          installment: "Full Payment",
          amount: 95000,
          dueDate: "2026-05-13T00:00:00Z",
          status: "paid",
          paymentId: "PAY_FULL_002",
        },
      ],
      commission: {
        platformCommission: 9500,
        platformCommissionPercentage: 10,
        vendorReceives: 85500,
      },
    },
    delivery: {
      scheduledDate: "2026-06-12",
      scheduledTime: "07:00",
      actualDeliveryTime: null,
      deliveryNotes: "Pending delivery",
      setupCompleted: false,
      teardownCompleted: false,
    },
    qualityCheck: {
      organizerCheck: null,
      vendorSelfCheck: null,
    },
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message: "We need robust AV for the Techverse Hackathon.",
        timestamp: "2026-05-10T11:00:00Z",
      },
    ],
    documents: {
      quotePdf: "https://storage.events.com/quotes/B002_quote.pdf",
      invoicePdf: "https://storage.events.com/invoices/B002_invoice.pdf",
      receiptPdf: "https://storage.events.com/receipts/B002_receipt.pdf",
    },
    review: {
      organizerReviewId: null,
      vendorReviewId: null,
      organizerRating: null,
      vendorRating: null,
    },
    createdAt: "2026-05-10T11:00:00Z",
    updatedAt: "2026-05-13T10:00:00Z",
    confirmedAt: "2026-05-13T10:00:00Z",
    completedAt: null,
    cancelledAt: null,
  },
  {
    bookingId: "B003",
    eventId: "evt_002",
    vendorId: "V002",
    organizerId: "org_001",
    serviceType: "decoration",
    serviceId: "SERV_DEC_001",
    requirements: {
      description: "Stage decoration and floral arrangements",
      serviceDate: "2026-07-15",
      startTime: "10:00",
      endTime: "17:00",
      location: "Convention Center, Islamabad",
      specialInstructions:
        "Eco-friendly flowers only. Colors: Purple and Gold.",
      guestCount: 500,
    },
    quote: {
      requestedAt: "2026-06-10T14:00:00Z",
      respondedAt: "2026-06-11T11:00:00Z",
      vendorQuote: {
        basePrice: 150000,
        additionalCharges: [
          { description: "Premium flower selection", amount: 25000 },
        ],
        discount: 0,
        totalAmount: 175000,
        breakdown: [
          {
            item: "Stage Backdrop",
            quantity: 1,
            unitPrice: 50000,
            total: 50000,
          },
          {
            item: "Floral Arrangements",
            quantity: 20,
            unitPrice: 5000,
            total: 100000,
          },
          {
            item: "Installation labor",
            quantity: 1,
            unitPrice: 25000,
            total: 25000,
          },
        ],
        terms: "30% deposit, 70% on event day.",
        validity: "2026-06-20T00:00:00Z",
      },
      negotiation: [],
    },
    status: "quote_sent",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-06-10T14:00:00Z" },
      { status: "quote_sent", timestamp: "2026-06-11T11:00:00Z" },
    ],
    contract: null,
    payment: {
      totalAmount: 175000,
      currency: "PKR",
      paymentSchedule: [
        {
          installment: "Deposit",
          amount: 52500,
          dueDate: "2026-06-15T00:00:00Z",
          status: "pending",
          paymentId: null,
        },
        {
          installment: "Final",
          amount: 122500,
          dueDate: "2026-07-15T00:00:00Z",
          status: "pending",
          paymentId: null,
        },
      ],
      commission: null,
    },
    delivery: {
      scheduledDate: "2026-07-15",
      scheduledTime: "09:00",
      actualDeliveryTime: null,
      deliveryNotes: "Awaiting confirmation",
      setupCompleted: false,
      teardownCompleted: false,
    },
    qualityCheck: null,
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message:
          "Need beautiful and eco-friendly decorations for our summer gala.",
        timestamp: "2026-06-10T14:00:00Z",
      },
    ],
    documents: {
      quotePdf: "https://storage.events.com/quotes/B003_quote.pdf",
      invoicePdf: null,
      receiptPdf: null,
    },
    review: {
      organizerReviewId: null,
      vendorReviewId: null,
      organizerRating: null,
      vendorRating: null,
    },
    createdAt: "2026-06-10T14:00:00Z",
    updatedAt: "2026-06-11T11:00:00Z",
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
  },
  {
    bookingId: "B004",
    eventId: "evt_003",
    vendorId: "V003",
    organizerId: "org_001",
    serviceType: "catering",
    serviceId: "SERV_CAT_002",
    requirements: {
      description: "Corporate breakfast and networking refreshments",
      serviceDate: "2026-06-20",
      startTime: "08:00",
      endTime: "10:30",
      location: "Business Park, Karachi",
      specialInstructions: "Include vegan and keto-friendly options",
      guestCount: 150,
    },
    quote: {
      requestedAt: "2026-06-01T09:00:00Z",
      respondedAt: "2026-06-02T10:15:00Z",
      vendorQuote: {
        basePrice: 75000,
        additionalCharges: [
          { description: "Special dietary preparation", amount: 8000 },
        ],
        discount: 5000,
        totalAmount: 78000,
        breakdown: [
          {
            item: "Breakfast spread",
            quantity: 150,
            unitPrice: 450,
            total: 67500,
          },
          {
            item: "Beverages station",
            quantity: 1,
            unitPrice: 15500,
            total: 15500,
          },
        ],
        terms: "50% now, 50% before event",
        validity: "2026-06-10T00:00:00Z",
      },
      negotiation: [
        {
          from: "organizer",
          message: "Can you reduce the price to 70000?",
          timestamp: "2026-06-02T15:00:00Z",
        },
        {
          from: "vendor",
          message: "We can do 75000 as our minimum. It's a competitive price.",
          timestamp: "2026-06-02T16:30:00Z",
        },
      ],
    },
    status: "quote_accepted",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-06-01T09:00:00Z" },
      { status: "quote_sent", timestamp: "2026-06-02T10:15:00Z" },
      { status: "quote_accepted", timestamp: "2026-06-03T11:00:00Z" },
    ],
    contract: {
      signed: false,
      signedByOrganizer: null,
      signedByVendor: null,
      signedAt: null,
      contractUrl: null,
      terms: null,
    },
    payment: {
      totalAmount: 78000,
      currency: "PKR",
      paymentSchedule: [
        {
          installment: "Advance",
          amount: 39000,
          dueDate: "2026-06-03T00:00:00Z",
          status: "paid",
          paymentId: "PAY_ADV_004",
        },
        {
          installment: "Final",
          amount: 39000,
          dueDate: "2026-06-20T00:00:00Z",
          status: "pending",
          paymentId: null,
        },
      ],
      commission: null,
    },
    delivery: {
      scheduledDate: "2026-06-20",
      scheduledTime: "07:30",
      actualDeliveryTime: null,
      deliveryNotes: "Awaiting confirmation",
      setupCompleted: false,
      teardownCompleted: false,
    },
    qualityCheck: null,
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message: "Corporate breakfast needed for business networking event.",
        timestamp: "2026-06-01T09:00:00Z",
      },
    ],
    documents: {
      quotePdf: "https://storage.events.com/quotes/B004_quote.pdf",
      invoicePdf: null,
      receiptPdf: null,
    },
    review: {
      organizerReviewId: null,
      vendorReviewId: null,
      organizerRating: null,
      vendorRating: null,
    },
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-03T11:00:00Z",
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
  },
  {
    bookingId: "B005",
    eventId: "evt_004",
    vendorId: "V001",
    organizerId: "org_001",
    serviceType: "catering",
    serviceId: "SERV_CAT_003",
    requirements: {
      description: "Wedding reception dinner for 400 guests",
      serviceDate: "2026-08-10",
      startTime: "19:00",
      endTime: "23:00",
      location: "Grand Ballroom, Lahore",
      specialInstructions: "Multi-course meal with chef presence",
      guestCount: 400,
    },
    quote: {
      requestedAt: "2026-05-15T10:00:00Z",
      respondedAt: "2026-05-16T14:00:00Z",
      vendorQuote: {
        basePrice: 650000,
        additionalCharges: [
          { description: "Chef and sous chef presence", amount: 50000 },
          { description: "Dessert premium selection", amount: 30000 },
        ],
        discount: 50000,
        totalAmount: 680000,
        breakdown: [
          {
            item: "Multi-course main",
            quantity: 400,
            unitPrice: 1200,
            total: 480000,
          },
          {
            item: "Premium beverages",
            quantity: 400,
            unitPrice: 250,
            total: 100000,
          },
          {
            item: "Service staff",
            quantity: 1,
            unitPrice: 100000,
            total: 100000,
          },
        ],
        terms: "25% advance, 50% 2 weeks before, 25% on event day",
        validity: "2026-05-30T00:00:00Z",
      },
      negotiation: [],
    },
    status: "in_progress",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-05-15T10:00:00Z" },
      { status: "quote_sent", timestamp: "2026-05-16T14:00:00Z" },
      { status: "quote_accepted", timestamp: "2026-05-18T09:00:00Z" },
      { status: "confirmed", timestamp: "2026-05-20T11:00:00Z" },
      { status: "in_progress", timestamp: "2026-08-10T18:00:00Z" },
    ],
    contract: {
      signed: true,
      signedByOrganizer: "org_001",
      signedByVendor: "V001",
      signedAt: "2026-05-18T15:00:00Z",
      contractUrl: "https://storage.events.com/contracts/B005.pdf",
      terms: {
        cancellationPolicy:
          "Full refund if cancelled 30 days prior; 75% within 15 days.",
        liability: "Vendor responsible for food safety and hygiene.",
      },
    },
    payment: {
      totalAmount: 680000,
      currency: "PKR",
      paymentSchedule: [
        {
          installment: "First installment",
          amount: 170000,
          dueDate: "2026-05-20T00:00:00Z",
          status: "paid",
          paymentId: "PAY_INST1_005",
        },
        {
          installment: "Second installment",
          amount: 340000,
          dueDate: "2026-07-25T00:00:00Z",
          status: "paid",
          paymentId: "PAY_INST2_005",
        },
        {
          installment: "Final payment",
          amount: 170000,
          dueDate: "2026-08-10T00:00:00Z",
          status: "pending",
          paymentId: null,
        },
      ],
      commission: {
        platformCommission: 68000,
        platformCommissionPercentage: 10,
        vendorReceives: 612000,
      },
    },
    delivery: {
      scheduledDate: "2026-08-10",
      scheduledTime: "18:00",
      actualDeliveryTime: "17:45",
      deliveryNotes:
        "Setup in progress. Chef arrived early for final preparations.",
      setupCompleted: true,
      teardownCompleted: false,
    },
    qualityCheck: {
      organizerCheck: null,
      vendorSelfCheck: {
        completed: false,
        report: null,
      },
    },
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message: "Premium wedding catering for 400 guests needed.",
        timestamp: "2026-05-15T10:00:00Z",
      },
    ],
    documents: {
      quotePdf: "https://storage.events.com/quotes/B005_quote.pdf",
      invoicePdf: "https://storage.events.com/invoices/B005_invoice.pdf",
      receiptPdf: null,
    },
    review: {
      organizerReviewId: null,
      vendorReviewId: null,
      organizerRating: null,
      vendorRating: null,
    },
    createdAt: "2026-05-15T10:00:00Z",
    updatedAt: "2026-08-10T18:30:00Z",
    confirmedAt: "2026-05-20T11:00:00Z",
    completedAt: null,
    cancelledAt: null,
  },
  {
    bookingId: "B006",
    eventId: "evt_005",
    vendorId: "V004",
    organizerId: "org_001",
    serviceType: "venue",
    serviceId: "SERV_VEN_001",
    requirements: {
      description: "Conference venue with meeting rooms",
      serviceDate: "2026-07-20",
      startTime: "09:00",
      endTime: "17:00",
      location: "City Center, Islamabad",
      specialInstructions: "Require WiFi, projectors in each room",
      guestCount: 200,
    },
    quote: {
      requestedAt: "2026-06-05T11:00:00Z",
      respondedAt: null,
      vendorQuote: null,
      negotiation: [],
    },
    status: "quote_requested",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-06-05T11:00:00Z" },
    ],
    contract: null,
    payment: {
      totalAmount: null,
      currency: "PKR",
      paymentSchedule: [],
      commission: null,
    },
    delivery: {
      scheduledDate: "2026-07-20",
      scheduledTime: "08:30",
      actualDeliveryTime: null,
      deliveryNotes: "Awaiting quote response",
      setupCompleted: false,
      teardownCompleted: false,
    },
    qualityCheck: null,
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message:
          "Looking for a spacious conference venue with excellent amenities.",
        timestamp: "2026-06-05T11:00:00Z",
      },
    ],
    documents: {
      quotePdf: null,
      invoicePdf: null,
      receiptPdf: null,
    },
    review: {
      organizerReviewId: null,
      vendorReviewId: null,
      organizerRating: null,
      vendorRating: null,
    },
    createdAt: "2026-06-05T11:00:00Z",
    updatedAt: "2026-06-05T11:00:00Z",
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
  },
  {
    bookingId: "B007",
    eventId: "evt_006",
    vendorId: "V001",
    organizerId: "org_001",
    serviceType: "catering",
    serviceId: "SERV_CAT_004",
    requirements: {
      description: "Outdoor picnic setup for 100 employees",
      serviceDate: "2026-06-25",
      startTime: "12:00",
      endTime: "15:00",
      location: "National Park, Rawalpindi",
      specialInstructions: "Portable setup, weather-resistant containers",
      guestCount: 100,
    },
    quote: {
      requestedAt: "2026-06-10T10:00:00Z",
      respondedAt: "2026-06-10T16:00:00Z",
      vendorQuote: {
        basePrice: 40000,
        additionalCharges: [
          { description: "Portable setup and cleanup", amount: 5000 },
        ],
        discount: 0,
        totalAmount: 45000,
        breakdown: [
          {
            item: "Picnic meal boxes",
            quantity: 100,
            unitPrice: 350,
            total: 35000,
          },
          { item: "Beverages", quantity: 100, unitPrice: 100, total: 10000 },
        ],
        terms: "Full payment 3 days before event",
        validity: "2026-06-15T00:00:00Z",
      },
      negotiation: [],
    },
    status: "cancelled",
    statusHistory: [
      { status: "quote_requested", timestamp: "2026-06-10T10:00:00Z" },
      { status: "quote_sent", timestamp: "2026-06-10T16:00:00Z" },
      { status: "quote_accepted", timestamp: "2026-06-11T09:00:00Z" },
      { status: "confirmed", timestamp: "2026-06-12T10:00:00Z" },
      { status: "cancelled", timestamp: "2026-06-20T14:30:00Z" },
    ],
    contract: {
      signed: true,
      signedByOrganizer: "org_001",
      signedByVendor: "V001",
      signedAt: "2026-06-11T14:00:00Z",
      contractUrl: "https://storage.events.com/contracts/B007.pdf",
      terms: {
        cancellationPolicy: "75% refund if cancelled 10 days prior.",
        liability: "Standard food safety liability.",
      },
    },
    payment: {
      totalAmount: 45000,
      currency: "PKR",
      paymentSchedule: [
        {
          installment: "Full Payment",
          amount: 45000,
          dueDate: "2026-06-22T00:00:00Z",
          status: "refunded",
          paymentId: "PAY_FUL_007",
        },
      ],
      commission: null,
    },
    delivery: {
      scheduledDate: "2026-06-25",
      scheduledTime: "11:30",
      actualDeliveryTime: null,
      deliveryNotes: "Booking cancelled by organizer due to venue change",
      setupCompleted: false,
      teardownCompleted: false,
    },
    qualityCheck: null,
    communications: [
      {
        type: "quote_request",
        from: "organizer",
        to: "vendor",
        message: "Team building event outdoor picnic.",
        timestamp: "2026-06-10T10:00:00Z",
      },
      {
        type: "cancellation",
        from: "organizer",
        to: "vendor",
        message:
          "We have to reschedule due to venue unavailability. We'll contact you next month.",
        timestamp: "2026-06-20T14:30:00Z",
      },
    ],
    documents: {
      quotePdf: "https://storage.events.com/quotes/B007_quote.pdf",
      invoicePdf: null,
      receiptPdf: null,
    },
    review: {
      organizerReviewId: null,
      vendorReviewId: null,
      organizerRating: null,
      vendorRating: null,
    },
    createdAt: "2026-06-10T10:00:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
    confirmedAt: "2026-06-12T10:00:00Z",
    completedAt: null,
    cancelledAt: "2026-06-20T14:30:00Z",
  },
];
