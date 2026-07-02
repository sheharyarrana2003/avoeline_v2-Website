// src/mock/events.mock.ts
import { EventModel, EventStats } from "@/src/services/models/event.model";

export const mockEvents: EventModel[] = [
  // Published Events[
  {
    "id": "EVT001",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Advanced Flutter & Firebase Workshop",
    "description": "Learn to build production-ready Flutter apps with production-grade Firebase configurations, local caching, and state management optimization.",
    "shortDescription": "2-day intensive Flutter workshop",
    "category": "technology",
    "eventType": "workshop",
    "format": "hybrid",
    "schedule": {
      "startDate": "2024-04-15",
      "endDate": "2024-04-16",
      "startTime": "10:00",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "NED University Auditorium",
      "address": "University Road, Karachi",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8695,
        "longitude": 67.0649
      },
      "meetingPlatform": "Google Meet",
      "meetingLink": "https://meet.google.com/abc-xyz-123",
      "meetingId": "abc-xyz-123",
      "meetingPassword": "flutter2024"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT001.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT001_1.jpg",
      "https://storage.googleapis.com/events/gal_EVT001_2.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "capacity": {
      "totalSeats": 100,
      "reservedSeats": 10,
      "availableSeats": 90
    },
    "registration": {
      "registrationOpenDate": "2024-03-01",
      "registrationCloseDate": "2024-04-14",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "experience_level",
          "label": "Flutter Experience Level",
          "type": "dropdown",
          "options": ["Beginner", "Intermediate", "Advanced"],
          "required": true
        }
      ]
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Early Bird",
          "price": 1500,
          "availableUntil": "2024-03-15",
          "seats": 30
        },
        {
          "name": "Regular",
          "price": 2000,
          "availableUntil": "2024-04-14",
          "seats": 60
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 20,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 5,
        "percentage": 15
      }
    },
    "speakers": [
      {
        "speakerId": "SPK001",
        "name": "Dr. Sarah Khan",
        "designation": "Senior Flutter Developer at Google",
        "bio": "10+ years experience in mobile development...",
        "profileImage": "https://storage.googleapis.com/speakers/sarah_khan.jpg",
        "sessionTitle": "State Management in Flutter"
      }
    ],
    "certificateConfig": {
      "issueCertificates": true,
      "certificateType": "digital",
      "templateId": "CERT_TEMPLATE_01",
      "requirements": {
        "minAttendance": 80,
        "mustCompleteSurvey": true
      }
    },
    "status": "registration_open",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 1245,
      "registrations": 89,
      "checkIns": 0,
      "completionRate": 0,
      "revenue": 178000
    },
    "createdAt": "2024-02-15T08:00:00Z",
    "updatedAt": "2024-03-01T10:30:00Z",
    "publishedAt": "2024-03-01T10:30:00Z",
    "eventStartTime": "2024-04-15T05:00:00Z",
    "eventEndTime": "2024-04-16T12:00:00Z"
  }
  ,
  {
    "id": "EVT002",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "National Healthcare Innovation Summit",
    "description": "Connecting medical technology innovators, hospital directors, and healthcare professionals to explore AI diagnostics and electronic health record transformations.",
    "shortDescription": "annual healthcare tech summit",
    "category": "healthcare",
    "eventType": "conference",
    "format": "physical",
    "schedule": {
      "startDate": "2024-06-20",
      "endDate": "2024-06-22",
      "startTime": "09:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Marriott Hotel Crystal Ballroom",
      "address": "Aga Khan Road, F-5/1",
      "city": "Islamabad",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 33.7380,
        "longitude": 73.0844
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/991002345",
      "meetingId": "991-002-345",
      "meetingPassword": "healthpass2024"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT002.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT002_1.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=healthcare_summit_teaser",
    "capacity": {
      "totalSeats": 300,
      "reservedSeats": 50,
      "availableSeats": 250
    },
    "registration": {
      "registrationOpenDate": "2024-04-01",
      "registrationCloseDate": "2024-06-15",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "hospital_affiliation",
          "label": "Hospital/Institute Name",
          "type": "text",
          "options": [],
          "required": true
        },
        {
          "fieldId": "medical_license",
          "label": "PMDC / License Number",
          "type": "text",
          "options": [],
          "required": false
        }
      ]
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "General Admission",
          "price": 5000,
          "availableUntil": "2024-06-15",
          "seats": 200
        },
        {
          "name": "VIP Pass",
          "price": 12000,
          "availableUntil": "2024-06-15",
          "seats": 50
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 50,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": false,
        "minGroupSize": 0,
        "percentage": 0
      }
    },
    "speakers": [
      {
        "speakerId": "SPK044",
        "name": "Prof. Asif Malik",
        "designation": "Director of Medical AI Labs",
        "bio": "Pioneer in radiological machine learning models.",
        "profileImage": "https://storage.googleapis.com/speakers/asif_malik.jpg",
        "sessionTitle": "AI and the Future of Oncology Diagnostics"
      }
    ],
    "certificateConfig": {
      "issueCertificates": true,
      "certificateType": "both",
      "templateId": "CERT_TEMPLATE_HEALTH_2024",
      "requirements": {
        "minAttendance": 70,
        "mustCompleteSurvey": false
      }
    },
    "status": "published",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 412,
      "registrations": 25,
      "checkIns": 0,
      "completionRate": 0,
      "revenue": 125000
    },
    "createdAt": "2024-03-10T14:22:00Z",
    "updatedAt": "2024-04-01T09:00:00Z",
    "publishedAt": "2024-04-01T09:00:00Z",
    "eventStartTime": "2024-06-20+04:00:00Z",
    "eventEndTime": "2024-06-22T13:00:00Z"
  }
  ,
  {
    "id": "EVT003",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "Corporate Finance Strategy Briefing",
    "description": "An exclusive, invitation-only briefing covering macroeconomic shifts, liquidity management, and tax structuring for mid-to-large enterprises.",
    "shortDescription": "Exclusive corporate finance seminar",
    "category": "business",
    "eventType": "seminar",
    "format": "virtual",
    "schedule": {
      "startDate": "2024-05-02",
      "endDate": "2024-05-02",
      "startTime": "15:00",
      "endTime": "17:30",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Online Executive Portal",
      "address": "Virtual Dashboard Access Only",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8607,
        "longitude": 67.0011
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/9876543210",
      "meetingId": "987-6543-210",
      "meetingPassword": "SECURE_FIN_2024"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT003.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT003_1.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=finance_briefing_preview",
    "capacity": {
      "totalSeats": 40,
      "reservedSeats": 5,
      "availableSeats": 35
    },
    "registration": {
      "registrationOpenDate": "2024-04-10",
      "registrationCloseDate": "2024-05-01",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "job_title",
          "label": "Corporate Job Title (e.g. CFO, Director)",
          "type": "text",
          "options": [],
          "required": true
        }
      ]
    },
    "pricing": {
      "isFree": true,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Executive Invitation Pass",
          "price": 0,
          "availableUntil": "2024-05-01",
          "seats": 35
        }
      ],
      "studentDiscount": {
        "enabled": false,
        "percentage": 0,
        "requiresVerification": false
      },
      "groupDiscount": {
        "enabled": false,
        "minGroupSize": 0,
        "percentage": 0
      }
    },
    "speakers": [
      {
        "speakerId": "SPK109",
        "name": "Mian Haris",
        "designation": "Partner at Capital Advisory Partners",
        "bio": "Former financial consultant for global fiscal policy units.",
        "profileImage": "https://storage.googleapis.com/speakers/mian_haris.jpg",
        "sessionTitle": "Navigating High-Interest Rate Ecosystems"
      }
    ],
    "certificateConfig": {
      "issueCertificates": false,
      "certificateType": "digital",
      "templateId": null,
      "requirements": {
        "minAttendance": 0,
        "mustCompleteSurvey": false
      }
    },
    "status": "draft",
    "visibility": "invite_only",
    "accessCode": "CFO_BRIEF_2024",
    "analytics": {
      "views": 45,
      "registrations": 12,
      "checkIns": 0,
      "completionRate": 0,
      "revenue": 0
    },
    "createdAt": "2024-04-01T11:00:00Z",
    "updatedAt": "2024-04-05T16:15:00Z",
    "publishedAt": null,
    "eventStartTime": "2024-05-02T10:00:00Z",
    "eventEndTime": "2024-05-02T12:30:00Z"
  }, {

    "id": "EVT004",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Generative AI Hackathon 2026",
    "description": "An intensive 48-hour challenge focused on building practical, scalable AI agents and retrieval-augmented generation pipelines using modern LLM infrastructure.",
    "shortDescription": "48-hour collaborative AI build challenge",
    "category": "technology",
    "eventType": "hackathon",
    "format": "hybrid",
    "schedule": {
      "startDate": "2026-08-14",
      "endDate": "2026-08-16",
      "startTime": "09:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "National Incubation Center",
      "address": "Plot 24, Sector H-9/1",
      "city": "Islamabad",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 33.6844,
        "longitude": 73.0479
      },
      "meetingPlatform": "Discord",
      "meetingLink": "https://discord.gg/genai-hackathon-2026",
      "meetingId": "genai-hack-2026",
      "meetingPassword": "hackthefuture"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT004.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT004_1.jpg",
      "https://storage.googleapis.com/events/gal_EVT004_2.jpg",
      "https://storage.googleapis.com/events/gal_EVT004_3.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=ai_hack_teaser",
    "capacity": {
      "totalSeats": 150,
      "reservedSeats": 20,
      "availableSeats": 130
    },
    "registration": {
      "registrationOpenDate": "2026-07-05",
      "registrationCloseDate": "2026-08-10",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "github_profile",
          "label": "GitHub Profile URL",
          "type": "text",
          "options": [],
          "required": true
        },
        {
          "fieldId": "team_status",
          "label": "Registration Status",
          "type": "dropdown",
          "options": ["Individual looking for team", "Registering as an intact team"],
          "required": true
        }
      ]
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Hacker Pass",
          "price": 1000,
          "availableUntil": "2026-08-10",
          "seats": 130
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 50,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 4,
        "percentage": 20
      }
    },
    "speakers": [
      {
        "speakerId": "SPK202",
        "name": "Zainab Mahmood",
        "designation": "Principal Research Engineer at AI Labs",
        "bio": "Specializes in fine-tuning localized open-source foundational models.",
        "profileImage": "https://storage.googleapis.com/speakers/zainab_m.jpg",
        "sessionTitle": "Optimizing Local Context for Rag Architectures"
      }
    ],
    "certificateConfig": {
      "issueCertificates": true,
      "certificateType": "blockchain",
      "templateId": "CERT_HACK_2026",
      "requirements": {
        "minAttendance": 90,
        "mustCompleteSurvey": true
      }
    },
    "status": "published",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 840,
      "registrations": 42,
      "checkIns": 0,
      "completionRate": 0.0,
      "revenue": 42000
    },
    "createdAt": "2026-06-25T10:00:00Z",
    "updatedAt": "2026-07-01T14:30:00Z",
    "publishedAt": "2026-07-01T14:30:00Z",
    "eventStartTime": "2026-08-14T04:00:00Z",
    "eventEndTime": "2026-08-16T13:00:00Z"
  },
  {
    "id": "EVT005",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "E-Commerce Growth Masterclass",
    "description": "A comprehensive deep dive into scale logistics, customer retention loops, and multi-channel marketing matrices for modern direct-to-consumer operations.",
    "shortDescription": "Strategic business growth framework",
    "category": "business",
    "eventType": "seminar",
    "format": "physical",
    "schedule": {
      "startDate": "2026-09-05",
      "endDate": "2026-09-05",
      "startTime": "14:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "LUMS Executive Development Center",
      "address": "DHA Phase 5",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.4716,
        "longitude": 74.4098
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/growth-masterclass-fallback",
      "meetingId": "882-9411-002",
      "meetingPassword": "growthpass2026"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT005.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT005_1.jpg",
      "https://storage.googleapis.com/events/gal_EVT005_2.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=ecom_scale_intro",
    "capacity": {
      "totalSeats": 60,
      "reservedSeats": 5,
      "availableSeats": 55
    },
    "registration": {
      "registrationOpenDate": "2026-07-01",
      "registrationCloseDate": "2026-09-01",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "current_revenue",
          "label": "Average Monthly Business Revenue",
          "type": "dropdown",
          "options": ["Under 500k PKR", "500k - 2M PKR", "2M+ PKR"],
          "required": true
        }
      ]
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Standard Entry",
          "price": 4500,
          "availableUntil": "2026-09-01",
          "seats": 55
        }
      ],
      "studentDiscount": {
        "enabled": false,
        "percentage": 0,
        "requiresVerification": false
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 3,
        "percentage": 10
      }
    },
    "speakers": [
      {
        "speakerId": "SPK411",
        "name": "Omer Rizvi",
        "designation": "Founding Partner at RetailScale",
        "bio": "Ex-Logistics lead with a proven track record scaling regional supply operations.",
        "profileImage": "https://storage.googleapis.com/speakers/omer_r.jpg",
        "sessionTitle": "Optimizing Supply Infrastructure for High Velocity Scale"
      }
    ],
    "certificateConfig": {
      "issueCertificates": true,
      "certificateType": "digital",
      "templateId": "CERT_ECOM_2026",
      "requirements": {
        "minAttendance": 100,
        "mustCompleteSurvey": true
      }
    },
    "status": "registration_open",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 185,
      "registrations": 14,
      "checkIns": 0,
      "completionRate": 0.0,
      "revenue": 63000
    },
    "createdAt": "2026-06-20T11:15:00Z",
    "updatedAt": "2026-07-01T09:00:00Z",
    "publishedAt": "2026-07-01T09:00:00Z",
    "eventStartTime": "2026-09-05T09:00:00Z",
    "eventEndTime": "2026-09-05T13:00:00Z"
  },
  {
    "id": "EVT006",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "Corporate Wellness & Mental Resilience Forum",
    "description": "Draft structure setting up executive workflows, ergonomic configurations, and scalable HR protocols targeting systemic structural burnout reduction.",
    "shortDescription": "Strategic framework for healthy operational workplaces",
    "category": "healthcare",
    "eventType": "conference",
    "format": "virtual",
    "schedule": {
      "startDate": "2026-11-12",
      "endDate": "2026-11-12",
      "startTime": "10:00",
      "endTime": "14:30",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Virtual Sandbox Hub",
      "address": "Online Stream Only",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5204,
        "longitude": 74.3587
      },
      "meetingPlatform": "Microsoft Teams",
      "meetingLink": "https://teams.microsoft.com/l/meetup-join/wellness-draft",
      "meetingId": "412-092-115",
      "meetingPassword": "internalDraft2026"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT006.jpg",
    "galleryImages": ["https://storage.googleapis.com/events/gal_EVT006_1.jpg"],
    "promoVideoUrl": "https://youtube.com/watch?v=wellness_draft_preview",
    "capacity": {
      "totalSeats": 200,
      "reservedSeats": 10,
      "availableSeats": 190
    },
    "registration": {
      "registrationOpenDate": "2026-10-01",
      "registrationCloseDate": "2026-11-10",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "organization_size",
          "label": "Total Headcount of Your Company",
          "type": "dropdown",
          "options": ["1-50 employees", "51-250 employees", "251+ employees"],
          "required": false
        }
      ]
    },
    "pricing": {
      "isFree": true,
      "currency": "PKR",
      "tiers": [],
      "studentDiscount": {
        "enabled": false,
        "percentage": 0,
        "requiresVerification": false
      },
      "groupDiscount": {
        "enabled": false,
        "minGroupSize": 0,
        "percentage": 0
      }
    },
    "speakers": [
      {
        "speakerId": "SPK105",
        "name": "Dr. Amna Baig",
        "designation": "Organizational Psychologist",
        "bio": "Consultant specializing in high-stress workspace dynamic shifts.",
        "profileImage": "https://storage.googleapis.com/speakers/amna_b.jpg",
        "sessionTitle": "De-escalating Chronic Executive Cognitive Burnout"
      }
    ],
    "certificateConfig": {
      "issueCertificates": false,
      "certificateType": "digital",
      "templateId": null,
      "requirements": {
        "minAttendance": 0,
        "mustCompleteSurvey": false
      }
    },
    "status": "draft",
    "visibility": "private",
    "accessCode": "WELLNESS_PREVIEW",
    "analytics": {
      "views": 12,
      "registrations": 0,
      "checkIns": 0,
      "completionRate": 0.0,
      "revenue": 0
    },
    "createdAt": "2026-07-02T08:30:00Z",
    "updatedAt": "2026-07-02T09:15:00Z",
    "publishedAt": null,
    "eventStartTime": "2026-11-12T05:00:00Z",
    "eventEndTime": "2026-11-12T09:30:00Z"
  },
  {
    "id": "EVT007",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "Modern Pedagogical Frameworks & EdTech Strategy",
    "description": "An interactive conference targeting real-time AI tool integration across institutional environments to build adaptive curriculum architectures.",
    "shortDescription": "Modern strategies transforming direct classroom tech integrations",
    "category": "education",
    "eventType": "conference",
    "format": "virtual",
    "schedule": {
      "startDate": "2026-07-02",
      "endDate": "2026-07-02",
      "startTime": "09:00",
      "endTime": "13:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "EdTech Cloud Portal",
      "address": "Virtual Learning Infrastructure",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8607,
        "longitude": 67.0011
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/live-edtech-session-stream",
      "meetingId": "991-8722-104",
      "meetingPassword": "educationlive2026"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT007.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT007_1.jpg",
      "https://storage.googleapis.com/events/gal_EVT007_2.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=live_edtech_framework",
    "capacity": {
      "totalSeats": 500,
      "reservedSeats": 50,
      "availableSeats": 450
    },
    "registration": {
      "registrationOpenDate": "2026-05-10",
      "registrationCloseDate": "2026-07-01",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "academic_role",
          "label": "Your Primary Educational Role",
          "type": "dropdown",
          "options": ["K-12 Teacher", "University Professor", "Academic Administrator", "EdTech Specialist"],
          "required": true
        }
      ]
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "General Admission",
          "price": 1200,
          "availableUntil": "2026-07-01",
          "seats": 450
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 30,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 5,
        "percentage": 15
      }
    },
    "speakers": [
      {
        "speakerId": "SPK388",
        "name": "Kamran Aslam",
        "designation": "Director of Technology at FutureAcademy",
        "bio": "Pioneer developer pushing adaptive custom LLM systems directly to modern classrooms.",
        "profileImage": "https://storage.googleapis.com/speakers/kamran_a.jpg",
        "sessionTitle": "Designing AI Companions for K-12 Student Workflows"
      }
    ],
    "certificateConfig": {
      "issueCertificates": true,
      "certificateType": "both",
      "templateId": "CERT_EDTECH_LIVE_2026",
      "requirements": {
        "minAttendance": 80,
        "mustCompleteSurvey": true
      }
    },
    "status": "ongoing",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 1540,
      "registrations": 312,
      "checkIns": 285,
      "completionRate": 0.0,
      "revenue": 374400
    },
    "createdAt": "2026-05-01T09:00:00Z",
    "updatedAt": "2026-07-02T04:00:00Z",
    "publishedAt": "2026-05-05T12:00:00Z",
    "eventStartTime": "2026-07-02T04:00:00Z",
    "eventEndTime": "2026-07-02T08:00:00Z"
  },
  {
    "id": "EVT008",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "SaaS Product Design Retrospective 2026",
    "description": "An analysis breaking down UI/UX components, cognitive conversion loops, and dynamic dashboard workflows derived from data collected across historical SaaS rollouts.",
    "shortDescription": "Retrospective data breakdown of user interface trends",
    "category": "technology",
    "eventType": "webinar",
    "format": "virtual",
    "schedule": {
      "startDate": "2026-06-10",
      "endDate": "2026-06-10",
      "startTime": "11:00",
      "endTime": "13:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Webinar Cloud Arena",
      "address": "Digital Stream Network",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8607,
        "longitude": 67.0011
      },
      "meetingPlatform": "Google Meet",
      "meetingLink": "https://meet.google.com/saas-design-retro-2026",
      "meetingId": "saas-dsgn-2026",
      "meetingPassword": "retropassword1"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT008.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/events/gal_EVT008_1.jpg",
      "https://storage.googleapis.com/events/gal_EVT008_2.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=saas_ux_retro",
    "capacity": {
      "totalSeats": 1000,
      "reservedSeats": 0,
      "availableSeats": 1000
    },
    "registration": {
      "registrationOpenDate": "2026-05-01",
      "registrationCloseDate": "2026-06-09",
      "requiresApproval": false,
      "customForm": []
    },
    "pricing": {
      "isFree": true,
      "currency": "PKR",
      "tiers": [],
      "studentDiscount": {
        "enabled": false,
        "percentage": 0,
        "requiresVerification": false
      },
      "groupDiscount": {
        "enabled": false,
        "minGroupSize": 0,
        "percentage": 0
      }
    },
    "speakers": [
      {
        "speakerId": "SPK099",
        "name": "Faisal Malik",
        "designation": "Staff Product Designer",
        "bio": "Ex-Silicon Valley system designer mapping clear user flows into complex software systems.",
        "profileImage": "https://storage.googleapis.com/speakers/faisal_m.jpg",
        "sessionTitle": "Reducing Interaction Cost across Complex Analytics Engines"
      }
    ],
    "certificateConfig": {
      "issueCertificates": true,
      "certificateType": "digital",
      "templateId": "CERT_TEMPLATE_UX_RETRO",
      "requirements": {
        "minAttendance": 95,
        "mustCompleteSurvey": true
      }
    },
    "status": "completed",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 3210,
      "registrations": 890,
      "checkIns": 745,
      "completionRate": 92.4,
      "revenue": 0
    },
    "createdAt": "2026-04-15T14:00:00Z",
    "updatedAt": "2026-06-10T15:00:00Z",
    "publishedAt": "2026-05-01T08:00:00Z",
    "eventStartTime": "2026-06-10T06:00:00Z",
    "eventEndTime": "2026-06-10T08:00:00Z"
  },
  {
    "id": "EVT009",
    "organizerId": "O_IC1oAGO8G8TuKsH8FNmFKGNVnvK2",
    "title": "Bioinformatics & Genetic Structuring Symposium",
    "description": "A deep research symposium targeting automated laboratory workflows, sequence parsing architectures, and multi-tenant database integration patterns that ended prematurely.",
    "shortDescription": "Advanced genetic sequence processing frameworks",
    "category": "healthcare",
    "eventType": "seminar",
    "format": "physical",
    "schedule": {
      "startDate": "2026-06-25",
      "endDate": "2026-06-25",
      "startTime": "13:00",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "PC Hotel Conference Wing B",
      "address": "Shahrah-e-Quaid-e-Azam",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5565,
        "longitude": 74.3275
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/cancelled-symposium-archive",
      "meetingId": "112-990-881",
      "meetingPassword": "none"
    },
    "bannerImage": "https://storage.googleapis.com/events/banner_EVT009.jpg",
    "galleryImages": [],
    "promoVideoUrl": "https://youtube.com/watch?v=bioinfo_teaser_archive",
    "capacity": {
      "totalSeats": 80,
      "reservedSeats": 10,
      "availableSeats": 70
    },
    "registration": {
      "registrationOpenDate": "2026-05-15",
      "registrationCloseDate": "2026-06-24",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "lab_clearance",
          "label": "Affiliated Laboratory ID",
          "type": "text",
          "options": [],
          "required": true
        }
      ]
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Delegate Pass",
          "price": 3000,
          "availableUntil": "2026-06-24",
          "seats": 70
        }
      ],
      "studentDiscount": {
        "enabled": false,
        "percentage": 0,
        "requiresVerification": false
      },
      "groupDiscount": {
        "enabled": false,
        "minGroupSize": 0,
        "percentage": 0
      }
    },
    "speakers": [
      {
        "speakerId": "SPK801",
        "name": "Dr. Tariq Zaman",
        "designation": "Head of Computational Genomics",
        "bio": "Lead researcher mapping scalable data architectures to complex protein sequencing models.",
        "profileImage": "https://storage.googleapis.com/speakers/tariq_z.jpg",
        "sessionTitle": "Algorithmic Speedups in Multi-Locus Data Parsing"
      }
    ],
    "certificateConfig": {
      "issueCertificates": false,
      "certificateType": "digital",
      "templateId": null,
      "requirements": {
        "minAttendance": 0,
        "mustCompleteSurvey": false
      }
    },
    "status": "cancelled",
    "visibility": "public",
    "accessCode": null,
    "analytics": {
      "views": 490,
      "registrations": 18,
      "checkIns": 0,
      "completionRate": 0.0,
      "revenue": 54000
    },
    "createdAt": "2026-05-10T10:00:00Z",
    "updatedAt": "2026-06-20T11:00:00Z",
    "publishedAt": "2026-05-12T09:00:00Z",
    "eventStartTime": "2026-06-25T08:00:00Z",
    "eventEndTime": "2026-06-25T12:00:00Z"
  }
]