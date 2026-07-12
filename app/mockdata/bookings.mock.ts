export const mockBookings =  [
  {
    "bookingId": "B_001_COMPLETED",
    "eventId": "EVT_7f8g9h1j2k3l4m5n6o7p",
    "vendorId": "V_a3jogRG5fRezebhMOWyc8XgNK9f1",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "catering",
    "serviceId": "PKG_V1_001",
    "requirements": {
      "description": "Premium multi-tier buffet hot lunch setups for 400 financial corporate summit attendants.",
      "serviceDate": "2026-11-18",
      "startTime": "13:00",
      "endTime": "15:00",
      "location": "Marriott Crystal Ballroom Louqnge Wing",
      
      "specialInstructions": "Rigid macroscopic labeling flags and isolated layouts for gluten-free/vegetarian profiles required.",
      "guestCount": 400
    },
    "quote": {
      "requestedAt": "2026-08-05T09:00:00Z",
      "respondedAt": "2026-08-06T11:30:00Z",
      "vendorQuote": {
        "basePrice": 880000,
        "additionalCharges": [
          { "description": "Separate VIP high-tea dynamic service setups adjacent east corridor", "amount": 40000 },
          { "description": "Supplementary dedicated service waiters crew", "amount": 30000 }
        ],
        "discount": 150000,
        "totalAmount": 800000,
        "breakdown": [
          { "item": "Corporate Main Course Buffer", "quantity": 400, "unitPrice": 2200, "total": 880000 }
        ],
        "terms": "50% non-refundable operational token advance payment to execute logistic lock in.",
        "validity": "2026-09-15"
      },
      "negotiation": [
        {
          "from": "organizer",
          "message": "We have recurring corporate accounts through this year. Can we optimize overall balance rates downward?",
          "timestamp": "2026-08-10T14:00:00Z"
        },
        {
          "from": "vendor",
          "message": "Approved high-volume partnership deduction applied to final summary block.",
          "timestamp": "2026-08-12T10:15:00Z"
        }
      ]
    },
    "status": "completed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-05T09:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-08-06T11:30:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-08-12T11:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-08-20T12:00:00Z" },
      { "status": "in_progress", "timestamp": "2026-11-18T04:00:00Z" },
      { "status": "completed", "timestamp": "2026-11-19T16:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd001_sys_7x",
      "signedAt": "2026-08-18T14:30:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_001_executed.pdf",
      "terms": {
        "cancellationPolicy": "50% base retainment rate applied if modification requested under 14 days parameter.",
        "liability": "Vendor guarantees strict synchronization with regional sanitation health mandates."
      }
    },
    "payment": {
      "totalAmount": 800000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Advance Booking Lock",
          "amount": 400000,
          "dueDate": "2026-08-20",
          "status": "paid",
          "paymentId": "PAY_HFT_M01"
        },
        {
          "installment": "Post Event Operational Settlement Balance",
          "amount": 400000,
          "dueDate": "2026-11-22",
          "status": "paid",
          "paymentId": "PAY_HFT_M09"
        }
      ],
      "commission": {
        "platformCommission": 120000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 680000
      }
    },
    "delivery": {
      "scheduledDate": "2026-11-18",
      "scheduledTime": "12:00",
      "actualDeliveryTime": "11:45",
      "deliveryNotes": "Buffet line stations live ahead of schedule index boundaries.",
      "setupCompleted": true,
      "teardownCompleted": true
    },
    "qualityCheck": {
      "organizerCheck": {
        "checked": true,
        "rating": 5,
        "comments": "Excellent deployment pace and layout accuracy constraints maintained perfectly.",
        "checkedAt": "2026-11-18T16:00:00Z"
      },
      "vendorSelfCheck": {
        "completed": true,
        "report": "All tracking fields executed accurately according to corporate sheet instructions."
      }
    },
    "communications": [
      {
        "type": "quote_request",
        "from": "organizer",
        "to": "vendor",
        "message": "Verify capabilities limits mapping for 400 attendants corporate buffet structures.",
        "timestamp": "2026-08-05T09:00:00Z"
      }
    ],
    "documents": {
      "quotePdf": "https://storage.googleapis.com/vendor-docs/B_001_quote_file.pdf",
      "invoicePdf": "https://storage.googleapis.com/vendor-docs/B_001_invoice_file.pdf",
      "receiptPdf": "https://storage.googleapis.com/vendor-docs/B_001_receipt_file.pdf"
    },
    "review": {
      "organizerReviewId": "REV_B001_ORG",
      "vendorReviewId": "REV_B001_VND",
      "organizerRating": 5,
      "vendorRating": 5
    },
    "createdAt": "2026-08-05T09:00:00Z",
    "updatedAt": "2026-11-19T16:00:00Z",
    "confirmedAt": "2026-08-20T12:00:00Z",
    "completedAt": "2026-11-19T16:00:00Z",
    "cancelledAt": null
  },
  {
    "bookingId": "B_002_CONFIRMED",
    "eventId": "EVT_8a9b0c1d2e3f4g5h6i7j",
    "vendorId": "V_flghfvVVfKWTt0hTpMHuj7hNJEw1",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "security",
    "serviceId": "PKG_V3_001",
    "requirements": {
      "description": "Hospital grade entrance whitelist verification deployment and parking barrier enforcement loops for oncology forum.",
      "serviceDate": "2026-12-05",
      "startTime": "07:30",
      "endTime": "18:00",
      "location": "Aga Khan University Center Entrance Gates",
      "specialInstructions": "Continuous match cross checking against registered doctor validation licensing indexes required.",
      "guestCount": 250
    },
    "quote": {
      "requestedAt": "2026-09-05T08:00:00Z",
      "respondedAt": "2026-09-06T10:15:00Z",
      "vendorQuote": {
        "basePrice": 45000,
        "additionalCharges": [
          { "description": "Extra mobile hand barcode scanner deployment units", "amount": 5000 }
        ],
        "discount": 0,
        "totalAmount": 50000,
        "breakdown": [
          { "item": "Corporate Guard Operator Units", "quantity": 1, "unitPrice": 45000, "total": 45000 }
        ],
        "terms": "Full balance processing mandatory upon execution of binding registration parameters.",
        "validity": "2026-10-15"
      },
      "negotiation": []
    },
    "status": "confirmed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-09-05T08:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-09-06T10:15:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-09-15T14:22:00Z" },
      { "status": "confirmed", "timestamp": "2026-09-20T10:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd003_sys_2k",
      "signedAt": "2026-09-18T11:30:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_002_contract.pdf",
      "terms": {
        "cancellationPolicy": "No baseline retention token returns generated if drop ordered under 7 calendar days windows.",
        "liability": "Guarantees robust background validation clearances for all field operators."
      }
    },
    "payment": {
      "totalAmount": 50000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Full Allocation Clearup",
          "amount": 50000,
          "dueDate": "2026-09-20",
          "status": "paid",
          "paymentId": "PAY_SEC_X02"
        }
      ],
      "commission": {
        "platformCommission": 60000,
        "platformCommissionPercentage": 12,
        "vendorReceives": 44000
      }
    },
    "delivery": {
      "scheduledDate": "2026-12-05",
      "scheduledTime": "07:00",
      "actualDeliveryTime": null,
      "deliveryNotes": null,
      "setupCompleted": false,
      "teardownCompleted": false
    },
    "qualityCheck": {},
    "communications": [],
    "documents": {
      "quotePdf": "https://storage.googleapis.com/vendor-docs/B_002_quote.pdf",
      "invoicePdf": "https://storage.googleapis.com/vendor-docs/B_002_invoice.pdf",
      "receiptPdf": null
    },
    "review": {},
    "createdAt": "2026-09-05T08:00:00Z",
    "updatedAt": "2026-09-20T10:00:00Z",
    "confirmedAt": "2026-09-20T10:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_003_IN_PROGRESS",
    "eventId": "EVT_k9Xm2P8qL5sW1zR0vN4jY",
    "vendorId": "V_6ks38RXiffVvAWYCbSqszyU9FXo2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "audiovisual",
    "serviceId": "PKG_V2_001",
    "requirements": {
      "description": "P2.5 LED wall distribution arrays, dynamic audio tracking links processing, and real-time live video recording capture frames integration.",
      "serviceDate": "2026-10-14",
      "startTime": "08:00",
      "endTime": "18:00",
      "location": "Movenpick Grand Ballroom Staging Deck",
      "specialInstructions": "Provide real-time low latency hardware stream encoding routing links directly into primary Zoom node channels.",
      "guestCount": 350
    },
    "quote": {
      "requestedAt": "2026-07-16T11:05:00Z",
      "respondedAt": "2026-07-18T15:40:00Z",
      "vendorQuote": {
        "basePrice": 280000,
        "additionalCharges": [
          { "description": "Supplementary active wireless lapel mic channels backup set", "amount": 20000 }
        ],
        "discount": 0,
        "totalAmount": 300000,
        "breakdown": [
          { "item": "Ballroom Tech Production Base Array", "quantity": 1, "unitPrice": 280000, "total": 280000 }
        ],
        "terms": "50% initialization balance processing mandatory to lock on equipment freight pathways routing rules.",
        "validity": "2026-08-15"
      },
      "negotiation": []
    },
    "status": "in_progress",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-07-16T11:05:00Z" },
      { "status": "quote_sent", "timestamp": "2026-07-18T15:40:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-07-28T09:12:00Z" },
      { "status": "confirmed", "timestamp": "2026-08-01T14:22:00Z" },
      { "status": "in_progress", "timestamp": "2026-10-14T03:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd002_sys_9f",
      "signedAt": "2026-07-30T10:00:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_003_av_lock.pdf",
      "terms": {
        "cancellationPolicy": "Initial allocation balance fully retained if disruption caused under 10 calendar days constraints.",
        "liability": "Full systemic accountability covering any operational equipment failure intervals tracking rules."
      }
    },
    "payment": {
      "totalAmount": 300000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Advance Mobilization Share",
          "amount": 150000,
          "dueDate": "2026-08-01",
          "status": "paid",
          "paymentId": "PAY_AV_A901"
        },
        {
          "installment": "Final Structural Closure Balance",
          "amount": 150000,
          "dueDate": "2026-10-16",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 45000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 255000
      }
    },
    "delivery": {
      "scheduledDate": "2026-10-14",
      "scheduledTime": "06:00",
      "actualDeliveryTime": "05:45",
      "deliveryNotes": "Ballroom rig assemblies deployed accurately, live communication tests passing.",
      "setupCompleted": true,
      "teardownCompleted": false
    },
    "qualityCheck": {},
    "communications": [],
    "documents": {
      "quotePdf": "https://storage.googleapis.com/vendor-docs/B_003_quote.pdf",
      "invoicePdf": "https://storage.googleapis.com/vendor-docs/B_003_invoice.pdf",
      "receiptPdf": null
    },
    "review": {},
    "createdAt": "2026-07-16T11:05:00Z",
    "updatedAt": "2026-10-14T03:00:00Z",
    "confirmedAt": "2026-08-01T14:22:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_004_QUOTE_SENT",
    "eventId": "EVT_9x8y7z6w5v4u3t2s1r0q",
    "vendorId": "V_JlvYzpeVuBbJfPixeLSbVZzh5Sv2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "custom",
    "serviceId": "PKG_V5_001",
    "requirements": {
      "description": "High volume live audio and stream interaction monitoring administration setup to maintain 500 student concurrent connections overheads safely.",
      "serviceDate": "2026-10-24",
      "startTime": "09:30",
      "endTime": "16:30",
      "location": "Online Stream Hub Infrastructure Nodes",
      "specialInstructions": "Deploy text processing pipeline engines to catch anomalous spam scripts inside real-time interactive forums boards.",
      "guestCount": 500
    },
    "quote": {
      "requestedAt": "2026-08-12T14:00:00Z",
      "respondedAt": "2026-08-14T11:20:00Z",
      "vendorQuote": {
        "basePrice": 50000,
        "additionalCharges": [
          { "description": "Supplementary localized latency tracer logging array setup", "amount": 5000 }
        ],
        "discount": 0,
        "totalAmount": 55000,
        "breakdown": [
          { "item": "Core Stream Moderation Block", "quantity": 1, "unitPrice": 50000, "total": 50000 }
        ],
        "terms": "Net-15 transaction execution parameters apply down from confirmed milestone verification cycles dates.",
        "validity": "2026-09-15"
      },
      "negotiation": [
        {
          "from": "organizer",
          "message": "Confirm capability loops tracing backup server parameters before quote lock down steps.",
          "timestamp": "2026-08-15T09:00:00Z"
        }
      ]
    },
    "status": "quote_sent",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-12T14:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-08-14T11:20:00Z" }
    ],
    "contract": {},
    "payment": {
      "totalAmount": 55000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Single Invoiced Post Event Settlement",
          "amount": 55000,
          "dueDate": "2026-11-10",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 5500,
        "platformCommissionPercentage": 10,
        "vendorReceives": 49500
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-08-12T14:00:00Z",
    "updatedAt": "2026-08-14T11:20:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_005_QUOTE_ACCEPTED",
    "eventId": "EVT_1a2b3c4d5e6f7g8h9i0j",
    "vendorId": "V_6ks38RXiffVvAWYCbSqszyU9FXo2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "audiovisual",
    "serviceId": "PKG_V2_001",
    "requirements": {
      "description": "High security closed-loop audio link isolation setups and dual crisp display projections models for cybersecurity forum.",
      "serviceDate": "2026-12-14",
      "startTime": "08:30",
      "endTime": "18:00",
      "location": "Pearl Continental Zaver Hall Main Deck",
      "specialInstructions": "Enforce strict encryption parameters over local radio frequency channel bounds to prevent exterior signals leak indicators.",
      "guestCount": 300
    },
    "quote": {
      "requestedAt": "2026-09-12T09:00:00Z",
      "respondedAt": "2026-09-15T16:45:00Z",
      "vendorQuote": {
        "basePrice": 280000,
        "additionalCharges": [],
        "discount": 10000,
        "totalAmount": 270000,
        "breakdown": [
          { "item": "Base Secure Theater Production Setup", "quantity": 1, "unitPrice": 280000, "total": 280000 }
        ],
        "terms": "50% billing clearance required to authorize local field engineers structural planning phases.",
        "validity": "2026-10-15"
      },
      "negotiation": []
    },
    "status": "quote_accepted",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-09-12T09:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-09-15T16:45:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-07-12T13:40:00Z" }
    ],
    "contract": {},
    "payment": {
      "totalAmount": 270000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Advance Phase Remittance",
          "amount": 135000,
          "dueDate": "2026-10-01",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 40500,
        "platformCommissionPercentage": 15,
        "vendorReceives": 229500
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-09-12T09:00:00Z",
    "updatedAt": "2026-07-12T13:40:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_006_QUOTE_REQUESTED",
    "eventId": "EVT_5k6l7m8n9o0p1q2r3s4t",
    "vendorId": "V_JlvYzpeVuBbJfPixeLSbVZzh5Sv2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "custom",
    "serviceId": "PKG_V5_001",
    "requirements": {
      "description": "Continuous platform text triage management and dynamic Q&A indexing configuration maps support for B2B SaaS growth accelerator.",
      "serviceDate": "2026-11-04",
      "startTime": "12:30",
      "endTime": "18:30",
      "location": "SaaS Platform Online Room Matrices",
      "specialInstructions": "Requires active moderation overrides capabilities to directly handle pipeline connection issues asynchronously.",
      "guestCount": 150
    },
    "quote": {
      "requestedAt": "2026-07-12T14:05:00Z",
      "respondedAt": null,
      "vendorQuote": null,
      "negotiation": []
    },
    "status": "quote_requested",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-07-12T14:05:00Z" }
    ],
    "contract": {},
    "payment": {},
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-07-12T14:05:00Z",
    "updatedAt": "2026-07-12T14:05:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_007_CANCELLED",
    "eventId": "EVT_3m4n5o6p7q8r9s0t1u2v",
    "vendorId": "V_ub8I2UpWOGR4RFakTXNiY33y8gV2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "printing",
    "serviceId": "PKG_V4_001",
    "requirements": {
      "description": "High resolution architectural blueprint catalog sheets prints and layout vinyl posters sets for smart cities seminar.",
      "serviceDate": "2026-10-28",
      "startTime": "08:00",
      "endTime": "12:00",
      "location": "NUST Civil Engineering Hub Base",
      "specialInstructions": "Deliver ultra durable thick heavy paper options to safeguard design vector scales from distortions rules.",
      "guestCount": 200
    },
    "quote": {
      "requestedAt": "2026-08-10T11:00:00Z",
      "respondedAt": "2026-08-12T14:22:00Z",
      "vendorQuote": {
        "basePrice": 65000,
        "additionalCharges": [],
        "discount": 5000,
        "totalAmount": 60000,
        "breakdown": [
          { "item": "Technical Print Package Array", "quantity": 1, "unitPrice": 65000, "total": 65000 }
        ],
        "terms": "Production phase fires instantly post digital proof layout validation approvals.",
        "validity": "2026-09-10"
      },
      "negotiation": []
    },
    "status": "cancelled",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-10T11:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-08-12T14:22:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-08-25T09:15:00Z" },
      { "status": "confirmed", "timestamp": "2026-09-02T16:00:00Z" },
      { "status": "cancelled", "timestamp": "2026-09-15T11:30:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd004_sys_4p",
      "signedAt": "2026-09-01T10:00:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_007_voided.pdf",
      "terms": {
        "cancellationPolicy": "Full cancellation processing authorization without penalty flags if triggered 30 days clear of date parameters.",
        "liability": "Restricted to material replacement parameters."
      }
    },
    "payment": {
      "totalAmount": 60000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Advance Security Hold",
          "amount": 30000,
          "dueDate": "2026-09-05",
          "status": "paid",
          "paymentId": "PAY_PRN_C001"
        }
      ],
      "commission": {
        "platformCommission": 9000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 51000
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [
      {
        "type": "cancellation_notice",
        "from": "organizer",
        "to": "vendor",
        "message": "Zoning tracking updates forced timeline shifts. Voiding printing booking parameter grids.",
        "timestamp": "2026-09-15T11:30:00Z"
      }
    ],
    "documents": {},
    "review": {},
    "createdAt": "2026-08-10T11:00:00Z",
    "updatedAt": "2026-09-15T11:30:00Z",
    "confirmedAt": "2026-09-02T16:00:00Z",
    "completedAt": null,
    "cancelledAt": "2026-09-15T11:30:00Z"
  },
  {
    "bookingId": "B_008_CONFIRMED",
    "eventId": "EVT_4o5p6q7r8s9t0u1v2w3x",
    "vendorId": "V_6ks38RXiffVvAWYCbSqszyU9FXo2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "audiovisual",
    "serviceId": "PKG_V2_001",
    "requirements": {
      "description": "High refresh Rate pixel terminal wall monitors and localized dynamic line sound tracking matrices setup for MLOps intensive.",
      "serviceDate": "2026-11-12",
      "startTime": "08:00",
      "endTime": "17:30",
      "location": "FAST-NUCES Computer Science Complex Auditorium Floor",
      "specialInstructions": "Ensure proper grounding logic checks to avoid network switch isolation hum markers entirely.",
      "guestCount": 120
    },
    "quote": {
      "requestedAt": "2026-08-20T09:00:00Z",
      "respondedAt": "2026-08-22T11:00:00Z",
      "vendorQuote": {
        "basePrice": 280000,
        "additionalCharges": [],
        "discount": 20000,
        "totalAmount": 260000,
        "breakdown": [
          { "item": "Academic Lab Scale Audio Visual Deck Setup", "quantity": 1, "unitPrice": 280000, "total": 280000 }
        ],
        "terms": "50% processing advance balance required to trigger network deployment clearance schedules.",
        "validity": "2026-09-30"
      },
      "negotiation": []
    },
    "status": "confirmed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-20T09:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-08-22T11:00:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-09-10T14:30:00Z" },
      { "status": "confirmed", "timestamp": "2026-09-15T11:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd002_sys_9f",
      "signedAt": "2026-09-12T16:00:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_008_fast_av.pdf",
      "terms": {
        "cancellationPolicy": "Standard tier platform cancellation protection frameworks apply.",
        "liability": "Vendor covers full operational functional guarantees over physical line connections."
      }
    },
    "payment": {
      "totalAmount": 260000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Mobilization Remittance",
          "amount": 130000,
          "dueDate": "2026-09-15",
          "status": "paid",
          "paymentId": "PAY_AV_F802"
        },
        {
          "installment": "Post Session Execution Wrap Close",
          "amount": 130000,
          "dueDate": "2026-11-15",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 39000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 221000
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-08-20T09:00:00Z",
    "updatedAt": "2026-09-15T11:00:00Z",
    "confirmedAt": "2026-09-15T11:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_009_QUOTE_ACCEPTED",
    "eventId": "EVT_6p7q8r9s0t1u2v3w4x5y",
    "vendorId": "V_JlvYzpeVuBbJfPixeLSbVZzh5Sv2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "custom",
    "serviceId": "PKG_V5_001",
    "requirements": {
      "description": "High security infrastructure stream hosting moderation administration and routing telemetry logic validation sets for blockchain healthcare seminar.",
      "serviceDate": "2026-11-25",
      "startTime": "09:30",
      "endTime": "16:30",
      "location": "Secure Health Online Portal Nodes",
      "specialInstructions": "Enforce strict encryption schemas across analytical pipeline nodes to keep metadata sets completely isolated.",
      "guestCount": 200
    },
    "quote": {
      "requestedAt": "2026-09-10T14:00:00Z",
      "respondedAt": "2026-09-14T10:15:00Z",
      "vendorQuote": {
        "basePrice": 50000,
        "additionalCharges": [],
        "discount": 0,
        "totalAmount": 50000,
        "breakdown": [
          { "item": "Base Dynamic Stream Protection Suite", "quantity": 1, "unitPrice": 50000, "total": 50000 }
        ],
        "terms": "Net-30 clearing window rules apply down from verified session validation ticks timelines.",
        "validity": "2026-10-15"
      },
      "negotiation": []
    },
    "status": "quote_accepted",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-09-10T14:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-09-14T10:15:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-09-28T10:00:00Z" }
    ],
    "contract": {},
    "payment": {
      "totalAmount": 50000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Single Standard Post Closing Balance Invoice",
          "amount": 50000,
          "dueDate": "2026-12-05",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 5000,
        "platformCommissionPercentage": 10,
        "vendorReceives": 45000
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-09-10T14:00:00Z",
    "updatedAt": "2026-09-28T10:00:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_010_CONFIRMED",
    "eventId": "EVT_7q8r9s0t1u2v3w4x5y6z",
    "vendorId": "V_6ks38RXiffVvAWYCbSqszyU9FXo2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "audiovisual",
    "serviceId": "PKG_V2_001",
    "requirements": {
      "description": "Ultra low leakage theater audio layouts installation and high lumen dual presentation display panels maps setup for high frequency trading forum.",
      "serviceDate": "2026-12-18",
      "startTime": "08:00",
      "endTime": "18:30",
      "location": "Movenpick Executive Suite Ballroom Base",
      "specialInstructions": "Eliminate any broadcast wireless frequencies matching classic protocol limits to counter dynamic sniffing variables.",
      "guestCount": 150
    },
    "quote": {
      "requestedAt": "2026-09-20T10:00:00Z",
      "respondedAt": "2026-09-24T12:00:00Z",
      "vendorQuote": {
        "basePrice": 280000,
        "additionalCharges": [
          { "description": "Dedicated out-of-band fiber cable injection lines rig layout", "amount": 10000 }
        ],
        "discount": 50000,
        "totalAmount": 240000,
        "breakdown": [
          { "item": "Secure Corporate Auditorium AV Deck Setup", "quantity": 1, "unitPrice": 280000, "total": 280000 }
        ],
        "terms": "50% advance booking balance clear steps mandatory before local freight loading validation approvals.",
        "validity": "2026-10-30"
      },
      "negotiation": [
        {
          "from": "organizer",
          "message": "We have low localized space requirements here, please optimize core logistics line margins.",
          "timestamp": "2026-10-02T11:00:00Z"
        },
        {
          "from": "vendor",
          "message": "Strategic regional adjustment discount index values applied directly into summary blocks.",
          "timestamp": "2026-10-05T15:30:00Z"
        }
      ]
    },
    "status": "confirmed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-09-20T10:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-09-24T12:00:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-10-12T09:15:00Z" },
      { "status": "confirmed", "timestamp": "2026-10-15T14:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd002_sys_9f",
      "signedAt": "2026-10-14T11:22:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_010_hft_av.pdf",
      "terms": {
        "cancellationPolicy": "Advance retainment indices tier fully locked if cancel ordered past the November validation parameters calendar date rules.",
        "liability": "Full technical replacement warranties apply over lines structural functions."
      }
    },
    "payment": {
      "totalAmount": 240000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Mobilization Hold Balance",
          "amount": 120000,
          "dueDate": "2026-10-15",
          "status": "paid",
          "paymentId": "PAY_AV_HFT_09"
        },
        {
          "installment": "Final Structural Closure Remittance",
          "amount": 120000,
          "dueDate": "2026-12-20",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 36000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 204000
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-09-20T10:00:00Z",
    "updatedAt": "2026-10-15T14:00:00Z",
    "confirmedAt": "2026-10-15T14:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_011_QUOTE_REQUESTED",
    "eventId": "EVT_8r9s0t1u2v3w4x5y6z7a",
    "vendorId": "V_JlvYzpeVuBbJfPixeLSbVZzh5Sv2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "custom",
    "serviceId": "PKG_V5_001",
    "requirements": {
      "description": "High volume streaming server connection moderator allocation and latency validation logs monitoring support for data mesh training.",
      "serviceDate": "2026-12-10",
      "startTime": "09:30",
      "endTime": "16:30",
      "location": "Data Engineering Cloud Streaming Portal Hub",
      "specialInstructions": "Deploy structural data pipeline telemetry checks to dynamically watch for frame dropping anomalies variables live.",
      "guestCount": 250
    },
    "quote": {
      "requestedAt": "2026-07-12T14:06:55Z",
      "respondedAt": null,
      "vendorQuote": null,
      "negotiation": []
    },
    "status": "quote_requested",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-07-12T14:06:55Z" }
    ],
    "contract": {},
    "payment": {},
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-07-12T14:06:55Z",
    "updatedAt": "2026-07-12T14:06:55Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_012_IN_PROGRESS",
    "eventId": "EVT_9s0t1u2v3w4x5y6z7a8b",
    "vendorId": "V_a3jogRG5fRezebhMOWyc8XgNK9f1",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "catering",
    "serviceId": "PKG_V1_001",
    "requirements": {
      "description": "High nutrition sports profile lunch buffers delivery and macronutrient dynamic labeling charts management for athletic science symposium.",
      "serviceDate": "2026-11-08",
      "startTime": "12:00",
      "endTime": "14:30",
      "location": "National High Performance Center Dining Annexe Wing",
      "specialInstructions": "Enforce clear separated cooking tracking profiles parameters to avoid cross fat contamination records rules.",
      "guestCount": 250
    },
    "quote": {
      "requestedAt": "2026-08-15T10:00:00Z",
      "respondedAt": "2026-08-18T14:00:00Z",
      "vendorQuote": {
        "basePrice": 550000,
        "additionalCharges": [
          { "description": "Custom high density protein dietary bars station deployment", "amount": 30000 }
        ],
        "discount": 20000,
        "totalAmount": 560000,
        "breakdown": [
          { "item": "High Nutrition Buffet Line Unit", "quantity": 250, "unitPrice": 2200, "total": 550000 }
        ],
        "terms": "50% deposit balance execution requested to structure fresh organic resource purchase operations timelines safely.",
        "validity": "2026-09-15"
      },
      "negotiation": []
    },
    "status": "in_progress",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-15T10:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-08-18T14:00:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-09-01T11:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-09-05T12:00:00Z" },
      { "status": "in_progress", "timestamp": "2026-07-12T14:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd001_sys_7x",
      "signedAt": "2026-09-04T10:15:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_012_sports_food.pdf",
      "terms": {
        "cancellationPolicy": "Standard tier platform cancellation protection rules model outlines apply.",
        "liability": "Vendor guarantees strict synchronization with state certified hygiene tracking rules parameters."
      }
    },
    "payment": {
      "totalAmount": 560000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Initialization Remittance",
          "amount": 280000,
          "dueDate": "2026-09-05",
          "status": "paid",
          "paymentId": "PAY_CAT_S901"
        },
        {
          "installment": "Final Wrap Settlement",
          "amount": 280000,
          "dueDate": "2026-11-12",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 84000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 476000
      }
    },
    "delivery": {
      "scheduledDate": "2026-11-08",
      "scheduledTime": "11:00",
      "actualDeliveryTime": "10:50",
      "deliveryNotes": "Dining wing installations set up smoothly ahead of schedule timelines limits.",
      "setupCompleted": true,
      "teardownCompleted": false
    },
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-08-15T10:00:00Z",
    "updatedAt": "2026-07-12T14:00:00Z",
    "confirmedAt": "2026-09-05T12:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_013_CONFIRMED",
    "eventId": "EVT_0u1v2w3x4y5z6a7b8c9d",
    "vendorId": "V_ub8I2UpWOGR4RFakTXNiY33y8gV2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "printing",
    "serviceId": "PKG_V4_001",
    "requirements": {
      "description": "Fine art catalog lookbooks prints and spatial entrance map layouts printing for art history biennale.",
      "serviceDate": "2026-11-14",
      "startTime": "09:00",
      "endTime": "13:00",
      "location": "Alhamra Arts Council Hall 2 Entry Hub",
      "specialInstructions": "Utilize textured high opacity matte stock options to verify art piece representations remain clean and color true.",
      "guestCount": 180
    },
    "quote": {
      "requestedAt": "2026-08-20T11:00:00Z",
      "respondedAt": "2026-08-22T16:00:00Z",
      "vendorQuote": {
        "basePrice": 65000,
        "additionalCharges": [
          { "description": "Supplementary color profile proofing alignment review step", "amount": 5000 }
        ],
        "discount": 15000,
        "totalAmount": 55000,
        "breakdown": [
          { "item": "Fine Paper Art Catalog Base Print Set", "quantity": 1, "unitPrice": 65000, "total": 65000 }
        ],
        "terms": "Production pipeline fires instantly down from clear token confirmation inputs logs.",
        "validity": "2026-09-20"
      },
      "negotiation": []
    },
    "status": "confirmed",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-20T11:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-08-22T16:00:00Z" },
      { "status": "quote_accepted", "timestamp": "2026-09-05T10:12:00Z" },
      { "status": "confirmed", "timestamp": "2026-09-12T15:00:00Z" }
    ],
    "contract": {
      "signed": true,
      "signedByOrganizer": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "signedByVendor": "USR_vnd004_sys_4p",
      "signedAt": "2026-09-10T14:00:00Z",
      "contractUrl": "https://storage.googleapis.com/event-contracts/B_013_art_print.pdf",
      "terms": {
        "cancellationPolicy": "Initial production lock in balance holds non refundable parameters rules if cancellation orders hit past printing operations setups templates.",
        "liability": "Restricted fully to product correction loops."
      }
    },
    "payment": {
      "totalAmount": 55000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Production Fire Deposit",
          "amount": 55000,
          "dueDate": "2026-09-12",
          "status": "paid",
          "paymentId": "PAY_PRN_A112"
        }
      ],
      "commission": {
        "platformCommission": 8250,
        "platformCommissionPercentage": 15,
        "vendorReceives": 46750
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-08-20T11:00:00Z",
    "updatedAt": "2026-09-12T15:00:00Z",
    "confirmedAt": "2026-09-12T15:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_014_QUOTE_SENT",
    "eventId": "EVT_1v2w3x4y5z6a7b8c9d0e",
    "vendorId": "V_JlvYzpeVuBbJfPixeLSbVZzh5Sv2",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "custom",
    "serviceId": "PKG_V5_001",
    "requirements": {
      "description": "High speed competition scoring registry tracking monitor array and real-time live video dashboard coordination for decentralization hackathon event.",
      "serviceDate": "2026-12-04",
      "startTime": "16:00",
      "endTime": "18:00",
      "location": "Online Competitive Server Mesh Platforms Environments",
      "specialInstructions": "Deploy fast diagnostic alerts nodes to monitor incoming repository updates loops performance statistics.",
      "guestCount": 300
    },
    "quote": {
      "requestedAt": "2026-09-10T14:00:00Z",
      "respondedAt": "2026-10-05T11:00:00Z",
      "vendorQuote": {
        "basePrice": 50000,
        "additionalCharges": [
          { "description": "Supplementary automated leaderboard tracking API script setups", "amount": 6000 }
        ],
        "discount": 0,
        "totalAmount": 560000,
        "breakdown": [
          { "item": "Core Virtual Infrastructure Moderation Array", "quantity": 1, "unitPrice": 50000, "total": 50000 }
        ],
        "terms": "Net-15 transaction mapping parameters trace from point of confirmed hackathon evaluations closure cycles dates.",
        "validity": "2026-11-15"
      },
      "negotiation": []
    },
    "status": "quote_sent",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-09-10T14:00:00Z" },
      { "status": "quote_sent", "timestamp": "2026-10-05T11:00:00Z" }
    ],
    "contract": {},
    "payment": {
      "totalAmount": 56000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Single Invoiced Post Event Closing Remittance Balance",
          "amount": 56000,
          "dueDate": "2026-12-20",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 5600,
        "platformCommissionPercentage": 10,
        "vendorReceives": 50400
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-09-10T14:00:00Z",
    "updatedAt": "2026-10-05T11:00:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  },
  {
    "bookingId": "B_015_QUOTE_ACCEPTED",
    "eventId": "EVT_2w3x4y5z6a7b8c9d0e1f",
    "vendorId": "V_a3jogRG5fRezebhMOWyc8XgNK9f1",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "serviceType": "catering",
    "serviceId": "PKG_V1_001",
    "requirements": {
      "description": "Premium day conference buffet catering array and separate coffee buffer lines management for B2B pipeline intensive.",
      "serviceDate": "2026-11-10",
      "startTime": "11:30",
      "endTime": "14:30",
      "location": "Avari Towers Khursheed Mahal Banquet Lounge Space",
      "specialInstructions": "Maintain continuous high-tea installation access routes set adjacent across the main networking loops borders.",
      "guestCount": 150
    },
    "quote": {
      "requestedAt": "2026-08-10T14:15:22Z",
      "respondedAt": "2026-08-15T11:04:12Z",
      "vendorQuote": {
        "basePrice": 330000,
        "additionalCharges": [
          { "description": "Supplementary dedicated premium coffee installation bars module", "amount": 25000 }
        ],
        "discount": 15000,
        "totalAmount": 340000,
        "breakdown": [
          { "item": "Premium Conference Main Buffer Line Unit", "quantity": 150, "unitPrice": 2200, "total": 330000 }
        ],
        "terms": "50% advance mobilization balance transaction mandatory to initialize logistics routing locks sets templates.",
        "validity": "2026-09-15"
      },
      "negotiation": []
    },
    "status": "quote_accepted",
    "statusHistory": [
      { "status": "quote_requested", "timestamp": "2026-08-10T14:15:22Z" },
      { "status": "quote_sent", "timestamp": "2026-08-15T11:04:12Z" },
      { "status": "quote_accepted", "timestamp": "2026-07-12T13:58:00Z" }
    ],
    "contract": {},
    "payment": {
      "totalAmount": 340000,
      "currency": "PKR",
      "paymentSchedule": [
        {
          "installment": "Advance Mobilization Remittance Hold",
          "amount": 170000,
          "dueDate": "2026-09-15",
          "status": "pending"
        }
      ],
      "commission": {
        "platformCommission": 51000,
        "platformCommissionPercentage": 15,
        "vendorReceives": 289000
      }
    },
    "delivery": {},
    "qualityCheck": {},
    "communications": [],
    "documents": {},
    "review": {},
    "createdAt": "2026-08-10T14:15:22Z",
    "updatedAt": "2026-07-12T13:58:00Z",
    "confirmedAt": null,
    "completedAt": null,
    "cancelledAt": null
  }
]
