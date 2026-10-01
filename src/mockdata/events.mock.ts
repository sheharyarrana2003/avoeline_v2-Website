// src/mock/events.mock.ts
import { EventModel } from "@/src/services/models/event.model";

export const raw_events = [
  {
    "eventId": "EVT_k9Xm2P8qL5sW1zR0vN4jY",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Next-Gen Enterprise Architecture Conference 2026",
    "description": "Join leading industry experts for a deep dive into scalable cloud-native architectures, real-time data streaming pipeline implementations, micro-frontends engineering, and advanced decentralized data meshes. This intensive conference combines strategic keynotes with deep-tech implementation tracks tailored for tech leads, staff engineers, and systems architects.",
    "shortDescription": "The definitive 2-day conference for cloud-native systems architecture and data engineering.",
    "category": "technology",
    "eventType": "conference",
    "format": "hybrid",
    "language": "en",
    "schedule": {
      "startDate": "2026-10-14",
      "endDate": "2026-10-15",
      "startTime": "09:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Movenpick Hotel Ballroom",
      "address": "Club Road, Civil Lines",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8472,
        "longitude": 67.0334
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/98765432101",
      "meetingId": "987-6543-2101",
      "meetingPassword": "architecture2026",
      "parkingInfo": "Complimentary valet parking available for all registered attendees at the main entrance.",
      "accessibilityInfo": "Fully wheelchair accessible venue with step-free entrance, dedicated elevator access, and reserved front-row seating.",
      "nearbyHotels": [
        "Pearl Continental Hotel Karachi",
        "Avari Towers Karachi",
        "Hotel Mehran"
      ],
      "nearbyRestaurants": [
        "The Marquee Restaurant",
        "Kababjees Clifton",
        "Okra Restaurant"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/EVT_architecture_2026_hero.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/venue_setup.jpg",
      "https://storage.googleapis.com/event-assets/gallery/networking_lounge.jpg",
      "https://storage.googleapis.com/event-assets/gallery/panel_stage.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "capacity": {
      "totalSeats": 350,
      "reservedSeats": 50,
      "availableSeats": 300,
      "waitingListEnabled": true,
      "waitingListCapacity": 50,
      "maxRegistrationsPerUser": 3
    },
    "registration": {
      "registrationOpenDate": "2026-07-15",
      "registrationCloseDate": "2026-10-12",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "experience_level",
          "label": "Architecture Experience Level",
          "type": "dropdown",
          "options": [
            "Mid-Level Engineer",
            "Senior Engineer",
            "Principal / Staff Architect",
            "Engineering Director / CTO"
          ],
          "required": true,
          "helpText": "Select your current technical leadership level"
        },
        {
          "fieldId": "primary_cloud",
          "label": "Primary Cloud Environment",
          "type": "dropdown",
          "options": ["AWS", "Google Cloud", "Azure", "On-Premises / Hybrid"],
          "required": true,
          "helpText": "Your primary cloud platform of choice"
        },
        {
          "fieldId": "dietary_restrictions",
          "label": "Dietary Restrictions",
          "type": "text",
          "options": [],
          "required": false,
          "helpText": "Please specify any allergies or dietary requirements (e.g., Nut Allergy, Vegetarian)"
        }
      ],
      "earlyBirdDeadline": "2026-08-31",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Early Bird Corporate Pass",
          "price": 7500,
          "availableUntil": "2026-08-31",
          "seats": 100,
          "description": "Discounted pass for early registrations by individuals or corporate entities."
        },
        {
          "name": "Regular Conference Pass",
          "price": 10000,
          "availableUntil": "2026-10-12",
          "seats": 200,
          "description": "Standard full-access pass to all technical tracks, networking sessions, and catered lunch."
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 40,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 4,
        "percentage": 15
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_001",
        "name": "Dr. Zainab Mahmood",
        "designation": "Principal Distributed Systems Architect",
        "bio": "Dr. Zainab has over 15 years of infrastructure design experience, formerly working at AWS on Amazon DynamoDB internal engines. She specializes in global consensus engines and high-throughput databases.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zainab_mahmood.jpg",
        "sessionTitle": "Keynote: Designing for Extreme Fault Tolerance at Scale",
        "email": "zainab.mahmood@systems-scale.io",
        "linkedin": "https://linkedin.com/in/zainab-mahmood-dist-sys",
        "twitter": "https://twitter.com/zainab_codes",
        "website": "https://systems-scale.io",
        "company": "Scale Dynamics Corp",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/scale_dynamics.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_001", "SESS_003"]
      },
      {
        "speakerId": "SPK_002",
        "name": "Asif Reza",
        "designation": "VP of Core Infrastructure",
        "bio": "Asif manages infrastructure pipelines processing upward of 10 Billion real-time telemetry markers daily. He is an active open-source contributor to Apache Kafka and cloud infrastructure provisioning toolsets.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/asif_reza.jpg",
        "sessionTitle": "Real-time Stream Interoperability across Multi-Cloud Environments",
        "email": "asif.reza@alphastream.net",
        "linkedin": "https://linkedin.com/in/asif-reza-infra",
        "twitter": "https://twitter.com/asif_stream",
        "website": "https://alphastream.net",
        "company": "AlphaStream Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/alphastream.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_002", "SESS_003"]
      },
      {
        "speakerId": "SPK_003",
        "name": "Esha Fatima",
        "designation": "Head of Engineering & Frontend Infrastructure",
        "bio": "Esha pioneers UI orchestration patterns for massive distributed engineering divisions. She successfully supervised micro-frontend strategies migrating monolithic platforms to federated web UI architectures.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/esha_fatima.jpg",
        "sessionTitle": "Federated Micro-Frontends: Scalability Beyond the Backend",
        "email": "esha.fatima@uilabs.org",
        "linkedin": "https://linkedin.com/in/esha-fatima-dev",
        "twitter": "https://twitter.com/esha_ui",
        "website": "https://uilabs.org",
        "company": "UI Labs International",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/uilabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 3,
        "sessions": ["SESS_004"]
      },
      {
        "speakerId": "SPK_004",
        "name": "Kamran Yusuf",
        "designation": "Chief Information Security Officer",
        "bio": "Kamran is a veteran cybersecurity auditor with deep background domains covering Zero-Trust Networks (ZTN) and edge security boundaries across regulated e-banking frameworks.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/kamran_yusuf.jpg",
        "sessionTitle": "Hardening Distributed Service Meshes Against Complex Attack Vectors",
        "email": "k.yusuf@securemesh.co",
        "linkedin": "https://linkedin.com/in/kamran-yusuf-cybersec",
        "twitter": "https://twitter.com/kamran_sec",
        "website": "https://securemesh.co",
        "company": "SecureMesh Advisors",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/securemesh.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_003", "SESS_005"]
      },
      {
        "speakerId": "SPK_005",
        "name": "Mirza Bilal",
        "designation": "Director of Data Engineering",
        "bio": "Mirza works extensively at building out operational enterprise data meshes. He guides data warehousing paradigms away from traditional central architectures into clean domain-driven ownership designs.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/mirza_bilal.jpg",
        "sessionTitle": "Decentralized Data Management: Transitioning to Data Mesh Paradigms",
        "email": "mbilal@datamesh-foundry.com",
        "linkedin": "https://linkedin.com/in/mirza-bilal-data",
        "twitter": "https://twitter.com/bilal_data",
        "website": "https://datamesh-foundry.com",
        "company": "DataMesh Foundry",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/datamesh_foundry.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 5,
        "sessions": ["SESS_006"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_001",
        "title": "Keynote: Designing for Extreme Fault Tolerance at Scale",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-10-14",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Ballroom",
        "room": "Grand Ballroom A",
        "building": "Hotel West Wing",
        "floor": "Ground Floor",
        "capacity": 350,
        "speakerNames": ["Dr. Zainab Mahmood"],
        "description": "An exploratory session detailing the anatomy of systems that survive regional cloud blackouts through distributed multi-region replication techniques.",
        "activities": [
          {
            "time": "09:30-09:45",
            "description": "Opening remarks and architectural landscape analysis overview",
            "type": "presentation"
          },
          {
            "time": "09:45-10:45",
            "description": "Deep-dive case studies on active-active replication models",
            "type": "presentation"
          },
          {
            "time": "10:45-11:00",
            "description": "Interactive theoretical systems design scenarios with audience feedback",
            "type": "discussion"
          }
        ],
        "notes": "Keynote session stream will be recorded live. Presentation slides will be dispatched to all ticket tiers afterwards.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_001_live.mp4",
        "feedbackFormUrl": "https://forms.google.com/feedback-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 350,
        "currentAttendees": 290,
        "customFields": {
          "githubRepo": "https://github.com/scale-dynamics-corp/fault-tolerance-blueprints",
          "exerciseFiles": "https://storage.googleapis.com/event-exercises/SESS_001_architectures.pdf"
        }
      },
      {
        "sessionId": "SESS_002",
        "title": "Real-time Stream Interoperability across Multi-Cloud Environments",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-10-14",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Technical Arena",
        "room": "Seminar Room B-2",
        "building": "Hotel East Wing",
        "floor": "1st Floor",
        "capacity": 150,
        "speakerNames": ["Asif Reza"],
        "description": "Practical architectural setup for streaming events seamlessly across separate cloud fabrics without suffering massive latency spikes.",
        "activities": [
          {
            "time": "11:30-11:50",
            "description": "Network baseline setups and cross-cloud VPC bridging principles",
            "type": "presentation"
          },
          {
            "time": "11:50-12:40",
            "description": "Live configuration of multi-cluster mirrors and consumer validation models",
            "type": "workshop",
            "requirements": ["Laptop", "AWS Account CLI", "GCP Account SDK Access"]
          },
          {
            "time": "12:40-13:00",
            "description": "Q&A on cross-border legal compliance around distributed data streams",
            "type": "discussion"
          }
        ],
        "notes": "Participants should ideally set up their infrastructure credentials beforehand.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_002_live.mp4",
        "feedbackFormUrl": "https://forms.google.com/feedback-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 142,
        "customFields": {
          "githubRepo": "https://github.com/alphastream-global/cross-cloud-kafka-mesh",
          "exerciseFiles": "https://storage.googleapis.com/event-exercises/SESS_002_config_templates.zip"
        }
      },
      {
        "sessionId": "SESS_003",
        "title": "Panel: The Next Decade of Cloud Infrastructures",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-10-14",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Ballroom",
        "room": "Grand Ballroom A",
        "building": "Hotel West Wing",
        "floor": "Ground Floor",
        "capacity": 350,
        "speakerNames": ["Dr. Zainab Mahmood", "Asif Reza", "Kamran Yusuf"],
        "description": "A collaborative panel discussion looking over the evolution towards serverless runtimes, decentralized systems edges, and upcoming security frameworks.",
        "activities": [
          {
            "time": "14:30-15:15",
            "description": "Panel debate surrounding edge compute versus centralized clouds",
            "type": "discussion"
          },
          {
            "time": "15:15-16:00",
            "description": "Moderated audience dynamic question routing block",
            "type": "discussion"
          }
        ],
        "notes": "No special setups needed; open to all attending passes.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_003_panel.mp4",
        "feedbackFormUrl": "https://forms.google.com/feedback-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 350,
        "currentAttendees": 310,
        "customFields": {}
      },
      {
        "sessionId": "SESS_004",
        "title": "Federated Micro-Frontends: Scalability Beyond the Backend",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-15",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Technical Arena",
        "room": "Seminar Room B-2",
        "building": "Hotel East Wing",
        "floor": "1st Floor",
        "capacity": 150,
        "speakerNames": ["Esha Fatima"],
        "description": "Breaking client side web systems into decentralized modules managed by autonomous teams using runtime module federation mechanics.",
        "activities": [
          {
            "time": "09:30-10:15",
            "description": "Deconstructing micro-frontend runtimes and continuous delivery frameworks",
            "type": "presentation"
          },
          {
            "time": "10:15-10:45",
            "description": "Live configuration of Webpack / Vite Module Federation options",
            "type": "presentation"
          },
          {
            "time": "10:45-11:00",
            "description": "Performance troubleshooting audit session open deck",
            "type": "discussion"
          }
        ],
        "notes": "Best suited for principal frontend and full-stack software paths.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_004_web.mp4",
        "feedbackFormUrl": "https://forms.google.com/feedback-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 98,
        "customFields": {
          "githubRepo": "https://github.com/uilabs-org/federated-module-architecture-demo",
          "exerciseFiles": "https://storage.googleapis.com/event-exercises/SESS_004_slides.pdf"
        }
      },
      {
        "sessionId": "SESS_005",
        "title": "Hardening Distributed Service Meshes Against Complex Attack Vectors",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-15",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Ballroom",
        "room": "Grand Ballroom B",
        "building": "Hotel West Wing",
        "floor": "Ground Floor",
        "capacity": 200,
        "speakerNames": ["Kamran Yusuf"],
        "description": "Actionable security approaches covering cryptographic identities, mutual TLS policies, and dynamic policy engines inside systems grids.",
        "activities": [
          {
            "time": "11:30-12:15",
            "description": "Deconstructing network perimeter breaches using zero-day threat models",
            "type": "presentation"
          },
          {
            "time": "12:15-12:45",
            "description": "Configuring SPIFFE/SPIRE runtime identity verification live",
            "type": "presentation"
          },
          {
            "time": "12:45-13:00",
            "description": "Security posture evaluation framework interactive deck",
            "type": "discussion"
          }
        ],
        "notes": "Intermediate to advanced security policy experience highly recommended.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_005_security.mp4",
        "feedbackFormUrl": "https://forms.google.com/feedback-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 200,
        "currentAttendees": 115,
        "customFields": {
          "githubRepo": "https://github.com/securemesh-advisors/spiffe-mesh-hardening",
          "exerciseFiles": "https://storage.googleapis.com/event-exercises/SESS_005_hardening_checklist.xlsx"
        }
      },
      {
        "sessionId": "SESS_006",
        "title": "Decentralized Data Management: Transitioning to Data Mesh Paradigms",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-15",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Technical Arena",
        "room": "Seminar Room B-2",
        "building": "Hotel East Wing",
        "floor": "1st Floor",
        "capacity": 150,
        "speakerNames": ["Mirza Bilal"],
        "description": "Moving beyond a single centralized data warehouse by structuring data pipelines around highly isolated domain logic frameworks.",
        "activities": [
          {
            "time": "14:30-15:20",
            "description": "Organizational and technological transformation requirements for data product units",
            "type": "presentation"
          },
          {
            "time": "15:20-15:50",
            "description": "Architectural governance and automated lineage tool assessment models",
            "type": "presentation"
          },
          {
            "time": "15:50-16:00",
            "description": "Open floor consultation on corporate governance blockers",
            "type": "discussion"
          }
        ],
        "notes": "Targeted directly at enterprise data engineers, team leadership paths, and analytical officers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_006_datamesh.mp4",
        "feedbackFormUrl": "https://forms.google.com/feedback-sess-006",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 130,
        "customFields": {
          "githubRepo": "https://github.com/datamesh-foundry/data-product-blueprint",
          "exerciseFiles": "https://storage.googleapis.com/event-exercises/SESS_006_mesh_whitepaper.pdf"
        }
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_001",
        "serviceCategory": "catering",
        "description": "Premium multi-tier buffet hot lunch setups for 350 attendants including dietary variety parameters.",
        "budget": 450000,
        "status": "assigned",
        "assignedVendorId": "VND_77a2B11c5",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-07-16T10:15:30Z",
        "assignedAt": "2026-08-01T14:22:00Z",
        "completedAt": null,
        "notes": "Must contain strict separated labeling for gluten-free and vegetarian options."
      },
      {
        "requirementId": "VR_002",
        "serviceCategory": "audiovisual",
        "description": "High-density dual projection array, backup audio mixers, staging arrays, and active multi-cam digital recording pipelines.",
        "budget": 300000,
        "status": "open",
        "assignedVendorId": null,
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-07-16T11:05:00Z",
        "assignedAt": null,
        "completedAt": null,
        "notes": "Requires live feed outputs setup into low-latency Zoom infrastructure configurations."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-12T01:00:00Z",
        "isActive": true
      },
      {
        "userId": "USR_v3N2m8K1qW5xZ9",
        "role": "moderator",
        "permissions": ["manage_registrations", "scan_tickets"],
        "addedAt": "2026-08-15T09:30:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-12T01:15:22Z",
    "updatedAt": "2026-07-15T18:42:10Z",
    "publishedAt": "2026-07-15T19:00:00Z",
    "eventStartTime": "2026-10-14T04:00:00Z",
    "eventEndTime": "2026-10-15T13:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  }
]


export const mockEvents: EventModel[] = raw_events.map(item => EventModel.fromJson(item));