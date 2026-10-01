import { EventModel } from "@/src/services/models/event.model";

 const rawmoreMockEvents = [
  {
    "eventId": "EVT_7f8g9h1j2k3l4m5n6o7p",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "National FinTech Innovation Summit 2026",
    "description": "A comprehensive corporate gathering focusing on modern financial technology systems. The event highlights changes in banking laws, decentralized ledger applications, automated algorithmic trading platforms, and customer verification APIs. Industry technical leads will share infrastructure blueprints and transition plans from legacy core banking applications.",
    "shortDescription": "The definitive summit for financial engineering, regulatory compliance, and distributed ledgers.",
    "category": "business",
    "eventType": "conference",
    "format": "physical",
    "language": "en",
    "schedule": {
      "startDate": "2026-11-18",
      "endDate": "2026-11-19",
      "startTime": "09:00",
      "endTime": "17:30",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Marriott Crystal Ballroom",
      "address": "Aga Khan Road, F-5/1",
      "city": "Islamabad",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 33.7345,
        "longitude": 73.0792
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://stream.fintechsummit.pk/live",
      "meetingId": "FTS2026",
      "meetingPassword": "secure_token_2026",
      "parkingInfo": "Basement multilevel parking complimentary for attendees with valid summit badges.",
      "accessibilityInfo": "Ramp access at East gate, tactical paving trails, and internal elevators available.",
      "nearbyHotels": [
        "Serena Hotel Islamabad",
        "Hotel Crown Plaza",
        "Ramada by Wyndham"
      ],
      "nearbyRestaurants": [
        "Monal Islamabad",
        "Savour Foods",
        "Tuscany Courtyard"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/fintech_2026_main.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/fts_hall.jpg",
      "https://storage.googleapis.com/event-assets/gallery/fts_panel.jpg",
      "https://storage.googleapis.com/event-assets/gallery/fts_lounge.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=ft_promo2026",
    "capacity": {
      "totalSeats": 400,
      "reservedSeats": 60,
      "availableSeats": 340,
      "waitingListEnabled": true,
      "waitingListCapacity": 80,
      "maxRegistrationsPerUser": 2
    },
    "registration": {
      "registrationOpenDate": "2026-08-01",
      "registrationCloseDate": "2026-11-15",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "corporate_sector",
          "label": "Industry Segment",
          "type": "dropdown",
          "options": ["Commercial Banking", "Digital Wallet Vendor", "State Regulatory Body", "Fintech Startup", "Academic Research"],
          "required": true,
          "helpText": "Select your organization's primary line of work"
        },
        {
          "fieldId": "clearance_level",
          "label": "Do you require VIP Lounge Access?",
          "type": "dropdown",
          "options": ["Yes, Executive Tier", "No, Standard Pass"],
          "required": true,
          "helpText": "Access controls apply based on ticket category selection"
        }
      ],
      "earlyBirdDeadline": "2026-09-30",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Standard Access Pass",
          "price": 12000,
          "availableUntil": "2026-11-15",
          "seats": 250,
          "description": "Full access to regular presentation halls, exhibition zones, and coffee buffers."
        },
        {
          "name": "Executive VIP Ticket",
          "price": 25000,
          "availableUntil": "2026-11-10",
          "seats": 90,
          "description": "Includes front row seating, private lounge entry, and corporate gala dinner ticket."
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 50,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 5,
        "percentage": 20
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_FT01",
        "name": "Haris Bin Tariq",
        "designation": "Chief Innovation Officer",
        "bio": "Haris orchestrates digital transformation initiatives across retail banking operations, bringing 18 years of micro-payment architectural experience.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/haris_tariq.jpg",
        "sessionTitle": "The Deconstruction of Legacy Core Banking Systems",
        "email": "haris.tariq@apexbank.com.pk",
        "linkedin": "https://linkedin.com/in/haris-tariq-banking",
        "twitter": "https://twitter.com/haris_bank_tech",
        "website": "https://apexbank.com.pk",
        "company": "Apex Bank Pakistan",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/apexbank.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_FT01", "SESS_FT04"]
      },
      {
        "speakerId": "SPK_FT02",
        "name": "Mariam Lodhi",
        "designation": "Director of Compliance & Cryptography",
        "bio": "Mariam designs standard operating procedures for anti-money laundering automated software routines and ledger authentication frameworks.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/mariam_lodhi.jpg",
        "sessionTitle": "Regulatory sandboxes and Centralized Electronic Currencies",
        "email": "m.lodhi@stategov.org.pk",
        "linkedin": "https://linkedin.com/in/mariam-lodhi-compliance",
        "twitter": "https://twitter.com/mariam_policy",
        "website": "https://stategov.org.pk",
        "company": "State Financial Regulatory Council",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/sfrc.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_FT02", "SESS_FT04"]
      },
      {
        "speakerId": "SPK_FT03",
        "name": "Zohair Khawaja",
        "designation": "Lead Ledger Architect",
        "bio": "Zohair builds consensus algorithms optimized for high-throughput, sub-second execution settlement systems serving international remittance corridors.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zohair_khawaja.jpg",
        "sessionTitle": "Deploying Practical Ledger Fabrics inside Enterprise Financial Systems",
        "email": "zohair@ledgerworks.io",
        "linkedin": "https://linkedin.com/in/zohair-khawaja-ledger",
        "twitter": "https://twitter.com/zohair_chain",
        "website": "https://ledgerworks.io",
        "company": "LedgerWorks Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/ledgerworks.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_FT03"]
      },
      {
        "speakerId": "SPK_FT04",
        "name": "Dr. Sana Wali",
        "designation": "Professor of Computational Economics",
        "bio": "Dr. Sana leads deep research initiatives centered around predictive machine learning systems acting on real-time consumer credit grading factors.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/sana_wali.jpg",
        "sessionTitle": "Predictive Risk Analytics: Beyond Classic Credit Scoring Models",
        "email": "sana.wali@nu.edu.pk",
        "linkedin": "https://linkedin.com/in/sana-wali-phd",
        "twitter": "https://twitter.com/sana_econ_tech",
        "website": "https://nu.edu.pk",
        "company": "National University of Economics",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/nue.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_FT04", "SESS_FT05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_FT01",
        "title": "The Deconstruction of Legacy Core Banking Systems",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-11-18",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Crystal Ballroom Hall A",
        "room": "Zone A",
        "building": "Main Hotel Structure",
        "floor": "Ground Floor",
        "capacity": 400,
        "speakerNames": ["Haris Bin Tariq"],
        "description": "A deep dissection of risk management frameworks required to peel apart legacy mainframe engines and shift logic into resilient event-driven cloud structures.",
        "activities": [
          { "time": "09:30-09:50", "description": "Analyzing runtime failure patterns of legacy database architectures", "type": "presentation" },
          { "time": "09:50-10:40", "description": "Decoupling methodologies using message brokers and live state synchronization", "type": "presentation" },
          { "time": "10:40-11:00", "description": "Audience interactive feedback and migration timeline debate", "type": "discussion" }
        ],
        "notes": "Intended primarily for enterprise systems engineers and technology executives.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_FT01.mp4",
        "feedbackFormUrl": "https://forms.google.com/ft-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 400,
        "currentAttendees": 320,
        "customFields": {
          "architectureDiagrams": "https://storage.googleapis.com/event-exercises/core_migration_flow.pdf"
        }
      },
      {
        "sessionId": "SESS_FT02",
        "title": "Regulatory sandboxes and Centralized Electronic Currencies",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-18",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Crystal Ballroom Hall B",
        "room": "Zone B",
        "building": "Main Hotel Structure",
        "floor": "Ground Floor",
        "capacity": 200,
        "speakerNames": ["Mariam Lodhi"],
        "description": "Understanding legal requirements, compliance validation routines, and state infrastructure models for central banking digital initiatives.",
        "activities": [
          { "time": "11:30-12:15", "description": "Reviewing legislative frameworks for domestic sovereign digital currencies", "type": "presentation" },
          { "time": "12:15-13:00", "description": "Audit parameters and multi-signature compliance pipelines review", "type": "presentation" }
        ],
        "notes": "Highly critical for risk managers and legal counsels working inside digital finance fields.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_FT02.mp4",
        "feedbackFormUrl": "https://forms.google.com/ft-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 200,
        "currentAttendees": 185,
        "customFields": {}
      },
      {
        "sessionId": "SESS_FT03",
        "title": "Deploying Practical Ledger Fabrics inside Enterprise Financial Systems",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-11-18",
        "startTime": "14:00",
        "endTime": "15:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Technical Deck",
        "room": "Executive Room 1",
        "building": "North Wing Annexe",
        "floor": "1st Floor",
        "capacity": 120,
        "speakerNames": ["Zohair Khawaja"],
        "description": "Step-by-step technical implementation of a permissioned private blockchain network designed for high-frequency reconciliation routines.",
        "activities": [
          { "time": "14:00-14:30", "description": "Setting up internal node validation clusters and private cryptographic channels", "type": "presentation" },
          { "time": "14:30-15:15", "description": "Writing and deploying smart contracts governing transaction settlements", "type": "workshop", "requirements": ["Docker installed", "NodeJS environment"] },
          { "time": "15:15-15:30", "description": "Stress testing block commits under high simulated data rates", "type": "workshop" }
        ],
        "notes": "Bring fully pre-configured laptops according to the prerequisite sheet mailed out.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_FT03.mp4",
        "feedbackFormUrl": "https://forms.google.com/ft-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 120,
        "currentAttendees": 118,
        "customFields": {
          "githubRepo": "https://github.com/ledgerworks-global/enterprise-fabric-setup"
        }
      },
      {
        "sessionId": "SESS_FT04",
        "title": "Panel: The Future of Open Banking Integrations",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-11-19",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Crystal Ballroom Hall A",
        "room": "Zone A",
        "building": "Main Hotel Structure",
        "floor": "Ground Floor",
        "capacity": 400,
        "speakerNames": ["Haris Bin Tariq", "Mariam Lodhi", "Dr. Sana Wali"],
        "description": "An cross-disciplinary panel exploring standardizations across public API channels for domestic consumer data sharing ecosystems.",
        "activities": [
          { "time": "10:00-11:00", "description": "Debating open API mandates versus proprietary core architectures", "type": "discussion" },
          { "time": "11:00-11:30", "description": "Audience open floor microphone session on consumer privacy concerns", "type": "discussion" }
        ],
        "notes": "No materials required.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_FT04.mp4",
        "feedbackFormUrl": "https://forms.google.com/ft-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 400,
        "currentAttendees": 360,
        "customFields": {}
      },
      {
        "sessionId": "SESS_FT05",
        "title": "Predictive Risk Analytics: Beyond Classic Credit Scoring Models",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-19",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Crystal Ballroom Hall B",
        "room": "Zone B",
        "building": "Main Hotel Structure",
        "floor": "Ground Floor",
        "capacity": 200,
        "speakerNames": ["Dr. Sana Wali"],
        "description": "Utilizing non-linear statistical models and machine learning pipelines to parse un-structured behavioral records into high-accuracy risk models.",
        "activities": [
          { "time": "13:30-14:20", "description": "Feature engineering over alternate transaction histories and unstructured datasets", "type": "presentation" },
          { "time": "14:20-14:50", "description": "Comparing neural network implementations against traditional logistic distributions", "type": "presentation" },
          { "time": "14:50-15:00", "description": "Addressing bias indicators in automated AI credit decisions", "type": "discussion" }
        ],
        "notes": "Familiarity with foundational statistics or data science stacks is highly recommended.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_FT05.mp4",
        "feedbackFormUrl": "https://forms.google.com/ft-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 200,
        "currentAttendees": 145,
        "customFields": {
          "datasetSample": "https://storage.googleapis.com/event-exercises/anonymous_credit_features.csv"
        }
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_FT01",
        "serviceCategory": "catering",
        "description": "Two days premium executive buffet catering services for up to 400 separate corporate attendants.",
        "budget": 750000,
        "status": "assigned",
        "assignedVendorId": "VND_MKT_009",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-05T09:00:00Z",
        "assignedAt": "2026-08-20T12:00:00Z",
        "completedAt": null,
        "notes": "Requires separate tea and high-tea provisions set adjacent to the main lounge wings."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-01T08:10:00Z",
    "updatedAt": "2026-08-20T12:00:00Z",
    "publishedAt": "2026-08-22T09:00:00Z",
    "eventStartTime": "2026-11-18T04:00:00Z",
    "eventEndTime": "2026-11-19T12:30:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_8a9b0c1d2e3f4g5h6i7j",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Oncology Research Paradigm Shift Conference",
    "description": "A deep gathering for clinical oncologists, genetic sequence researchers, and molecular laboratory developers. The forum targets modern advancements regarding targeted immunotherapies, algorithmic cancer detection networks, pipeline gene mapping models, and modern multi-institutional clinical trial standard frameworks.",
    "shortDescription": "Exploring precision healthcare pipelines, computational genomics, and advanced targeted immunotherapy.",
    "category": "healthcare",
    "eventType": "conference",
    "format": "hybrid",
    "language": "en",
    "schedule": {
      "startDate": "2026-12-05",
      "endDate": "2026-12-06",
      "startTime": "08:30",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Aga Khan University Center Auditorium",
      "address": "National Stadium Road",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8922,
        "longitude": 67.0747
      },
      "meetingPlatform": "Microsoft Teams",
      "meetingLink": "https://teams.microsoft.com/l/meetup-join/oncology2026",
      "meetingId": "912-345-678",
      "meetingPassword": "med_science_2026",
      "parkingInfo": "Dedicated medical professional parking deck clear signs located on Sector B entrance road.",
      "accessibilityInfo": "Fully integrated hospital-grade accessibility layout with tactical mechanical elevators throughout.",
      "nearbyHotels": [
        "Regent Plaza Hotel",
        "Hotel Days Inn",
        "The Enterprise Inn"
      ],
      "nearbyRestaurants": [
        "Lal Qila Restaurant",
        "Chaupal Buffet",
        "Kaybees Clifton"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/oncology_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/med_auditorium.jpg",
      "https://storage.googleapis.com/event-assets/gallery/lab_tours.jpg",
      "https://storage.googleapis.com/event-assets/gallery/poster_hall.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=med_promo2026",
    "capacity": {
      "totalSeats": 250,
      "reservedSeats": 40,
      "availableSeats": 210,
      "waitingListEnabled": true,
      "waitingListCapacity": 30,
      "maxRegistrationsPerUser": 1
    },
    "registration": {
      "registrationOpenDate": "2026-09-01",
      "registrationCloseDate": "2026-12-01",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "medical_license_number",
          "label": "PMDC / Medical Practitioner Registration Number",
          "type": "text",
          "options": [],
          "required": true,
          "helpText": "Required to authorize continuing medical education credits validation"
        },
        {
          "fieldId": "specialization_focus",
          "label": "Clinical Specialization Area",
          "type": "dropdown",
          "options": ["Medical Oncology", "Surgical Oncology", "Computational Biology", "Pathology Research", "General Residency"],
          "required": true,
          "helpText": "Helps select specialized session room capacities effectively"
        }
      ],
      "earlyBirdDeadline": "2026-10-15",
      "groupRegistrationEnabled": false,
      "groupDiscountEnabled": false
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Consultant Medical Practitioner",
          "price": 15000,
          "availableUntil": "2026-12-01",
          "seats": 150,
          "description": "Standard medical practitioner entry including certified attendance documentation."
        },
        {
          "name": "Resident Researcher Pass",
          "price": 6000,
          "availableUntil": "2026-12-01",
          "seats": 60,
          "description": "Discount tier optimized for dynamic academic medical research pathways."
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
        "speakerId": "SPK_MED01",
        "name": "Prof. Dr. Tariq Mahmood",
        "designation": "Head of Molecular Pathology Division",
        "bio": "Prof. Tariq has authored over 80 peer-reviewed research papers detailing mutation mappings across polymorphic regional tissues.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/tariq_mahmood.jpg",
        "sessionTitle": "Keynote: Next Generation Sequencing in Precision Medicine Delivery",
        "email": "t.mahmood@aku.edu",
        "linkedin": "https://linkedin.com/in/tariq-mahmood-pathology",
        "twitter": "https://twitter.com/tariq_pathology",
        "website": "https://aku.edu",
        "company": "Aga Khan University Medical System",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/aku_logo.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_MED01", "SESS_MED04"]
      },
      {
        "speakerId": "SPK_MED02",
        "name": "Dr. Sarah Jenkins",
        "designation": "Lead Immunotherapy Advisor",
        "bio": "Dr. Jenkins spends her research horizons investigating T-cell modification patterns to counteract hyper-aggressive cell growths.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/sarah_jenkins.jpg",
        "sessionTitle": "Monoclonal Antibody Paradigms: Successes and Current Roadblocks",
        "email": "s.jenkins@biomed-labs.org",
        "linkedin": "https://linkedin.com/in/sarah-jenkins-immunology",
        "twitter": "https://twitter.com/s_jenkins_labs",
        "website": "https://biomed-labs.org",
        "company": "BioMed Laboratories Europe",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/biomed.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_MED02", "SESS_MED04"]
      },
      {
        "speakerId": "SPK_MED03",
        "name": "Dr. Faraz Alvi",
        "designation": "Computational Genomics Director",
        "bio": "Dr. Faraz runs computational data pipelines designed to cross-reference multi-omic datasets for uncovering early structural tumor markers.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/faraz_alvi.jpg",
        "sessionTitle": "Machine Learning Classifiers in Early Tissue Anomaly Scanning",
        "email": "faraz.alvi@healthdata.pk",
        "linkedin": "https://linkedin.com/in/faraz-alvi-genomics",
        "twitter": "https://twitter.com/faraz_bioinformatics",
        "website": "https://healthdata.pk",
        "company": "HealthData Analytics PK",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/healthdata.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_MED03"]
      },
      {
        "speakerId": "SPK_MED04",
        "name": "Dr. Ayesha Niazi",
        "designation": "Clinical Trials Operations Supervisor",
        "bio": "Dr. Ayesha oversees multi-national compliance procedures ensuring international ethics guidelines are maintained within medical test pathways.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/ayesha_niazi.jpg",
        "sessionTitle": "Optimizing Adaptive Trial Framework Designs for Faster Verification",
        "email": "ayesha.niazi@trial-ops.com",
        "linkedin": "https://linkedin.com/in/ayesha-niazi-trials",
        "twitter": "https://twitter.com/ayesha_trials",
        "website": "https://trial-ops.com",
        "company": "TrialOps International",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/trialops.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_MED04", "SESS_MED05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_MED01",
        "title": "Keynote: Next Generation Sequencing in Precision Medicine Delivery",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-12-05",
        "startTime": "09:00",
        "endTime": "10:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Auditorium Deck",
        "room": "Hall A",
        "building": "AKU Center for Excellence",
        "floor": "Ground Floor",
        "capacity": 250,
        "speakerNames": ["Prof. Dr. Tariq Mahmood"],
        "description": "Elucidating modern breakthroughs regarding fast throughput DNA/RNA sequencing frameworks to isolate custom treatment directions for specific mutation variants.",
        "activities": [
          { "time": "09:00-09:20", "description": "Historical timeline of sequencing latency and pricing changes", "type": "presentation" },
          { "time": "09:20-10:10", "description": "Mapping genetic polymorph variants against treatment reaction vectors", "type": "presentation" },
          { "time": "10:10-10:30", "description": "Open expert audience technical consultation block", "type": "discussion" }
        ],
        "notes": "Presentation notes will count for 1.5 CME certification units.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_MED01.mp4",
        "feedbackFormUrl": "https://forms.google.com/med-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 250,
        "currentAttendees": 210,
        "customFields": {
          "cmeCreditsAwarded": "1.5"
        }
      },
      {
        "sessionId": "SESS_MED02",
        "title": "Monoclonal Antibody Paradigms: Successes and Current Roadblocks",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-05",
        "startTime": "11:00",
        "endTime": "12:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Research Annex Hall",
        "room": "Seminar Room 1",
        "building": "Laboratory Wing B",
        "floor": "1st Floor",
        "capacity": 100,
        "speakerNames": ["Dr. Sarah Jenkins"],
        "description": "A dense biochemical review focusing on building custom synthetic structures capable of identifying and latching securely onto harmful target cell configurations.",
        "activities": [
          { "time": "11:00-11:45", "description": "Structural evaluation of laboratory synthetic antibody binding processes", "type": "presentation" },
          { "time": "11:45-12:30", "description": "Reviewing data from global patient testing pools regarding tumor regressions", "type": "presentation" }
        ],
        "notes": "Requires deep familiarity with organic molecular pathways.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_MED02.mp4",
        "feedbackFormUrl": "https://forms.google.com/med-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 85,
        "customFields": {}
      },
      {
        "sessionId": "SESS_MED03",
        "title": "Machine Learning Classifiers in Early Tissue Anomaly Scanning",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-12-05",
        "startTime": "14:00",
        "endTime": "15:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Computational Bioscience Lab",
        "room": "Bio-Lab 4",
        "building": "AKU Center for Excellence",
        "floor": "2nd Floor",
        "capacity": 60,
        "speakerNames": ["Dr. Faraz Alvi"],
        "description": "Hands-on implementation of convolutional classification structures to run multi-spectral parsing evaluations over high-resolution pixel tissue arrays.",
        "activities": [
          { "time": "14:00-14:30", "description": "Pre-processing high-density medical image formats and normalizing color fields", "type": "presentation" },
          { "time": "14:30-15:15", "description": "Training classification pipelines on labeled benchmark mutation image arrays", "type": "workshop", "requirements": ["Python 3.10 with PyTorch ready", "CUDA drivers verified"] },
          { "time": "15:15-15:30", "description": "Analyzing precision and recall curve drops across real-world pixel noise", "type": "workshop" }
        ],
        "notes": "Seating capacity is strictly limited due to physical workstation availability constraints.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_MED03.mp4",
        "feedbackFormUrl": "https://forms.google.com/med-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 60,
        "currentAttendees": 59,
        "customFields": {
          "githubRepo": "https://github.com/healthdata-pk/medical-image-classifier-demo"
        }
      },
      {
        "sessionId": "SESS_MED04",
        "title": "Panel: Transnational Collaboration Challenges in Global Healthcare Trials",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-12-06",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Auditorium Deck",
        "room": "Hall A",
        "building": "AKU Center for Excellence",
        "floor": "Ground Floor",
        "capacity": 250,
        "speakerNames": ["Prof. Dr. Tariq Mahmood", "Dr. Sarah Jenkins", "Dr. Ayesha Niazi"],
        "description": "A strategic cross-border discussion detailing administrative gridlocks, ethical compliance variables, and data security protocols.",
        "activities": [
          { "time": "10:00-10:50", "description": "Debating standardization of regulatory approval timelines across varied continents", "type": "discussion" },
          { "time": "10:50-11:30", "description": "Addressing patient confidentiality tracking laws in cross-border datasets", "type": "discussion" }
        ],
        "notes": "Open interactive floor forum.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_MED04.mp4",
        "feedbackFormUrl": "https://forms.google.com/med-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 250,
        "currentAttendees": 220,
        "customFields": {}
      },
      {
        "sessionId": "SESS_MED05",
        "title": "Optimizing Adaptive Trial Framework Designs for Faster Verification",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-06",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Research Annex Hall",
        "room": "Seminar Room 1",
        "building": "Laboratory Wing B",
        "floor": "1st Floor",
        "capacity": 100,
        "speakerNames": ["Dr. Ayesha Niazi"],
        "description": "Moving toward Bayesian adaptive methods allowing researchers to adjust sample size allocations dynamically without reducing structural statistical power.",
        "activities": [
          { "time": "13:30-14:15", "description": "Mathematical models for interim data processing rules during active test phases", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Case study review of modern accelerated therapeutic approvals globally", "type": "presentation" }
        ],
        "notes": "Essential overview for clinical research coordinators.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_MED05.mp4",
        "feedbackFormUrl": "https://forms.google.com/med-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 72,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_MED01",
        "serviceCategory": "security",
        "description": "High profile security details to coordinate parking restrictions and entrance validation workflows across main university entry gates.",
        "budget": 120000,
        "status": "assigned",
        "assignedVendorId": "VND_SEC_991",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-09-05T08:00:00Z",
        "assignedAt": "2026-09-20T10:00:00Z",
        "completedAt": null,
        "notes": "Requires strict verification logs matches with registered doctor licensing lists."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-02T11:00:00Z",
    "updatedAt": "2026-09-20T10:00:00Z",
    "publishedAt": "2026-09-22T08:00:00Z",
    "eventStartTime": "2026-12-05T03:30:00Z",
    "eventEndTime": "2026-12-06T12:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_9x8y7z6w5v4u3t2s1r0q",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Emerging Methods in Pedagogy & Cognitive Learning",
    "description": "An academic forum designed for university department chairs, institutional researchers, and educational software engineers. Topics are centered on scaling personalized mastery tracks, building accessible online grading analytics, evaluating virtual reality lab software, and managing blended student collaboration paradigms.",
    "shortDescription": "Evaluating cognitive development strategies, adaptive testing software, and modern classroom orchestration models.",
    "category": "education",
    "eventType": "seminar",
    "format": "virtual",
    "language": "en",
    "schedule": {
      "startDate": "2026-10-24",
      "endDate": "2026-10-25",
      "startTime": "10:00",
      "endTime": "16:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Virtual Learning Portal",
      "address": "Online Stream Hub",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5204,
        "longitude": 74.3587
      },
      "meetingPlatform": "Google Meet",
      "meetingLink": "https://meet.google.com/edu-learning-2026",
      "meetingId": "edu-learning-2026",
      "meetingPassword": "pedagogy_access_2026",
      "parkingInfo": "Not applicable due to virtual web event execution format.",
      "accessibilityInfo": "Live closed captioning feeds in English alongside keyboard navigated interactive UI layouts.",
      "nearbyHotels": [],
      "nearbyRestaurants": []
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/education_2026_banner.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/edu_portal_ui.jpg",
      "https://storage.googleapis.com/event-assets/gallery/edu_speakers.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=edu_promo_2026",
    "capacity": {
      "totalSeats": 500,
      "reservedSeats": 30,
      "availableSeats": 470,
      "waitingListEnabled": false,
      "waitingListCapacity": 0,
      "maxRegistrationsPerUser": 5
    },
    "registration": {
      "registrationOpenDate": "2026-08-10",
      "registrationCloseDate": "2026-10-22",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "educational_affiliation",
          "label": "Affiliated Academic Institution",
          "type": "text",
          "options": [],
          "required": true,
          "helpText": "Enter full school, college, or university network title"
        }
      ],
      "earlyBirdDeadline": "2026-09-15",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
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
        "speakerId": "SPK_EDU01",
        "name": "Prof. Dr. Amjad Ali",
        "designation": "Dean of Digital Learning Sciences",
        "bio": "Prof. Amjad designs multi-campus massive open online course frameworks holding 22 years of structural system delivery histories.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/amjad_ali.jpg",
        "sessionTitle": "Keynote: Structuring Mastery-Based Learning Paradigms within Large Classrooms",
        "email": "amjad.ali@lums.edu.pk",
        "linkedin": "https://linkedin.com/in/amjad-ali-edu",
        "twitter": "https://twitter.com/amjad_digital",
        "website": "https://lums.edu.pk",
        "company": "LUMS School of Education",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/lums.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_EDU01", "SESS_EDU04"]
      },
      {
        "speakerId": "SPK_EDU02",
        "name": "Dr. Rebecca Vance",
        "designation": "Senior Cognitive Development Analyst",
        "bio": "Dr. Vance analyzes cognitive load dynamics when users ingest abstract conceptual information using alternative UI designs.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/rebecca_vance.jpg",
        "sessionTitle": "Quantifying Cognitive Load Strains within Digital Interface Systems",
        "email": "r.vance@cognitive-inst.org",
        "linkedin": "https://linkedin.com/in/rebecca-vance-cognitive",
        "twitter": "https://twitter.com/rvance_research",
        "website": "https://cognitive-inst.org",
        "company": "Global Cognitive Development Institute",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/gcdi.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_EDU02", "SESS_EDU04"]
      },
      {
        "speakerId": "SPK_EDU03",
        "name": "Zayd Farooq",
        "designation": "Head of Platform Engineering",
        "bio": "Zayd compiles adaptive scoring logic engines capable of adjusting questionnaire difficulty metrics dynamically using real-time error telemetry.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zayd_farooq.jpg",
        "sessionTitle": "Engineering Real-time Item Response Engines on Modern Platform Architectures",
        "email": "zayd@edutech-solutions.com",
        "linkedin": "https://linkedin.com/in/zayd-farooq-edtech",
        "twitter": "https://twitter.com/zayd_edtech",
        "website": "https://edutech-solutions.com",
        "company": "EduTech Solutions Corp",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/edutech.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_EDU03"]
      },
      {
        "speakerId": "SPK_EDU04",
        "name": "Fatimah Shah",
        "designation": "Director of Instructional Experience",
        "bio": "Fatimah bridges physical classroom layouts with digital collaborative tools, reducing frictional adoption curves for non-technical educators.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/fatimah_shah.jpg",
        "sessionTitle": "Orchestrating Blended Collaborative Spaces: A Practical Blueprint",
        "email": "f.shah@edudesign.org",
        "linkedin": "https://linkedin.com/in/fatimah-shah-instructional",
        "twitter": "https://twitter.com/fatimah_designs",
        "website": "https://edudesign.org",
        "company": "EduDesign Collaborative",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/edudesign.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_EDU04", "SESS_EDU05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_EDU01",
        "title": "Keynote: Structuring Mastery-Based Learning Paradigms within Large Classrooms",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-10-24",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Portal Main Stream",
        "room": "Room Alpha",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 500,
        "speakerNames": ["Prof. Dr. Amjad Ali"],
        "description": "How to transform linear timeline coursework structures into modular dependency logic matrices to support decentralized self-paced student progression tracking.",
        "activities": [
          { "time": "10:00-10:25", "description": "Reviewing standard failures associated with fixed time, variable outcome learning", "type": "presentation" },
          { "time": "10:25-11:15", "description": "Mapping structural tracking data schemas optimized for tracking individualized knowledge validation nodes", "type": "presentation" },
          { "time": "11:15-11:30", "description": "Open chat Q&A panel processing submitted virtual queries", "type": "discussion" }
        ],
        "notes": "Video records will index dynamically by topic blocks for post event lookup.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_EDU01.mp4",
        "feedbackFormUrl": "https://forms.google.com/edu-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 500,
        "currentAttendees": 412,
        "customFields": {}
      },
      {
        "sessionId": "SESS_EDU02",
        "title": "Quantifying Cognitive Load Strains within Digital Interface Systems",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-24",
        "startTime": "12:00",
        "endTime": "13:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Portal Track 2",
        "room": "Room Beta",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 250,
        "speakerNames": ["Dr. Rebecca Vance"],
        "description": "Analyzing ocular fixation tracking graphs and task interruption logs to map out interface patterns that inadvertently generate high working memory fatigue.",
        "activities": [
          { "time": "12:00-12:50", "description": "Reviewing data records detailing ocular tracking metrics over varied data screens", "type": "presentation" },
          { "time": "12:50-13:30", "description": "Proposing clean UI design layouts that isolate critical instructional fields", "type": "presentation" }
        ],
        "notes": "Recommended for digital application builders and textbook layout engineering teams.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_EDU02.mp4",
        "feedbackFormUrl": "https://forms.google.com/edu-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 250,
        "currentAttendees": 195,
        "customFields": {}
      },
      {
        "sessionId": "SESS_EDU03",
        "title": "Engineering Real-time Item Response Engines on Modern Platform Architectures",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-10-24",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Portal Engineering Room",
        "room": "Room Gamma",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Zayd Farooq"],
        "description": "Step by step review of coding adaptive validation logic that recalculates underlying student capability scores mid-examination after each answered challenge.",
        "activities": [
          { "time": "14:30-15:00", "description": "Reviewing item response probability formulas and continuous scaling equations", "type": "presentation" },
          { "time": "15:00-15:45", "description": "Writing real-time score adjustment functions inside localized application frameworks", "type": "workshop", "requirements": ["IDE ready with execution runtime", "Cloned baseline git branch"] },
          { "time": "15:45-16:00", "description": "Simulating high volume concurrent scoring actions over simulated response sets", "type": "workshop" }
        ],
        "notes": "Code repository links will distribute via internal stream interface panels.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_EDU03.mp4",
        "feedbackFormUrl": "https://forms.google.com/edu-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 140,
        "customFields": {
          "githubRepo": "https://github.com/edutech-solutions/adaptive-irt-engine"
        }
      },
      {
        "sessionId": "SESS_EDU04",
        "title": "Panel: Digital Divide Variables across Developing Infrastructure Systems",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-10-25",
        "startTime": "10:30",
        "endTime": "12:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Portal Main Stream",
        "room": "Room Alpha",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 500,
        "speakerNames": ["Prof. Dr. Amjad Ali", "Dr. Rebecca Vance", "Fatimah Shah"],
        "description": "A deep operational discussion looking at optimizing educational asset formats to run cleanly over low bandwidth mobile networks or legacy smartphones.",
        "activities": [
          { "time": "10:30-11:20", "description": "Mapping bandwidth realities and fallback architectures for rural learning zones", "type": "discussion" },
          { "time": "11:20-12:00", "description": "Evaluating offline state sync solutions inside deployed educational apps", "type": "discussion" }
        ],
        "notes": "Open chat board enabled for remote live question submittals.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_EDU04.mp4",
        "feedbackFormUrl": "https://forms.google.com/edu-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 500,
        "currentAttendees": 465,
        "customFields": {}
      },
      {
        "sessionId": "SESS_EDU05",
        "title": "Orchestrating Blended Collaborative Spaces: A Practical Blueprint",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-25",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Portal Track 2",
        "room": "Room Beta",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 250,
        "speakerNames": ["Fatimah Shah"],
        "description": "Step-by-step frameworks that combine remote data storage patterns with physical group lab workflows, establishing continuous tracking boundaries.",
        "activities": [
          { "time": "13:30-14:20", "description": "Designing peer evaluation validation routines inside cross-functional learning tracking dashboards", "type": "presentation" },
          { "time": "14:20-15:00", "description": "Analyzing empirical research metrics tracing student engagement levels across long horizons", "type": "presentation" }
        ],
        "notes": "Downloadable framework worksheets available in the attachments panel.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_EDU05.mp4",
        "feedbackFormUrl": "https://forms.google.com/edu-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 250,
        "currentAttendees": 180,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_EDU01",
        "serviceCategory": "custom",
        "description": "Managed cloud live streaming server array setup with bandwidth overhead to process 500 concurrent continuous media delivery outputs.",
        "budget": 90000,
        "status": "assigned",
        "assignedVendorId": "VND_CLD_442",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-12T14:00:00Z",
        "assignedAt": "2026-08-25T11:00:00Z",
        "completedAt": null,
        "notes": "Must ensure integrated data telemetry outputs for monitoring stream frame drops."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-03T09:00:00Z",
    "updatedAt": "2026-08-25T11:00:00Z",
    "publishedAt": "2026-08-28T10:00:00Z",
    "eventStartTime": "2026-10-24T05:00:00Z",
    "eventEndTime": "2026-10-25T11:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_1a2b3c4d5e6f7g8h9i0j",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "International Cybersecurity & Cryptographic Infrastructure Forum",
    "description": "A dedicated multi-track event exploring defensive operational methodologies. Focus points target automated network threat tracking systems, multi-factor hardware cryptographic systems, verification validation models, secure supply chain configuration frameworks, and reactive strategy playbooks for handling cloud security breaches.",
    "shortDescription": "Advanced defense mechanisms covering zero-trust configurations, kernel protection tracking, and automated patch arrays.",
    "category": "technology",
    "eventType": "conference",
    "format": "physical",
    "language": "en",
    "schedule": {
      "startDate": "2026-12-14",
      "endDate": "2026-12-15",
      "startTime": "09:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Pearl Continental Zaver Hall",
      "address": "Shahrah-e-Quaid-e-Azam",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5562,
        "longitude": 74.3284
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://secure-portal.cyberforum.pk",
      "meetingId": "SEC2026",
      "meetingPassword": "kernel_protection_now",
      "parkingInfo": "Secured internal parking structure overseen by private security validation points.",
      "accessibilityInfo": "Ground floor access routes with automated doors and wide layout corridors suitable for mobility support equipment.",
      "nearbyHotels": [
        "Avari Hotel Lahore",
        "Luxus Grand Hotel",
        "Hospitality Inn"
      ],
      "nearbyRestaurants": [
        "Cuckoo's Den",
        "Andaaz Restaurant",
        "Bundu Khan"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/cybersec_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/sec_stage.jpg",
      "https://storage.googleapis.com/event-assets/gallery/sec_ctf_room.jpg",
      "https://storage.googleapis.com/event-assets/gallery/sec_booths.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=sec_promo_2026",
    "capacity": {
      "totalSeats": 300,
      "reservedSeats": 50,
      "availableSeats": 250,
      "waitingListEnabled": true,
      "waitingListCapacity": 40,
      "maxRegistrationsPerUser": 2
    },
    "registration": {
      "registrationOpenDate": "2026-09-10",
      "registrationCloseDate": "2026-12-10",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "security_clearance",
          "label": "Current Security Certification Status",
          "type": "dropdown",
          "options": ["CISSP", "CEH", "OSCP", "CompTIA Security+", "None / Academic Student"],
          "required": true,
          "helpText": "Helps index technical experience scores across tracking groups"
        }
      ],
      "earlyBirdDeadline": "2026-10-30",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Professional Operator Registration",
          "price": 18000,
          "availableUntil": "2026-12-10",
          "seats": 200,
          "description": "Full access to keynotes, defensive simulation sandboxes, and continuous network validation tracks."
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 60,
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
        "speakerId": "SPK_SEC01",
        "name": "Taimoor Hassan",
        "designation": "Director of Threat Infrastructure Mitigation",
        "bio": "Taimoor traces advanced threat persistence networks for international infrastructure corporations, holding 14 years of kernel diagnostic histories.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/taimoor_hassan.jpg",
        "sessionTitle": "Keynote: Tracing Cryptographic Vulnerabilities within Multi-Cloud Boundaries",
        "email": "t.hassan@secure-grid.net",
        "linkedin": "https://linkedin.com/in/taimoor-hassan-sec",
        "twitter": "https://twitter.com/taimoor_kernel",
        "website": "https://secure-grid.net",
        "company": "SecureGrid Network Infrastructure",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/securegrid.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_SEC01", "SESS_SEC04"]
      },
      {
        "speakerId": "SPK_SEC02",
        "name": "Elena Rostova",
        "designation": "Principal Security Engineer",
        "bio": "Elena designs complex multi-tenant zero trust enforcement systems and open-source automated patch compilation workflows.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/elena_rostova.jpg",
        "sessionTitle": "Deploying Dynamic Policy-Driven Access controls in Cluster Architectures",
        "email": "e.rostova@defenselabs.org",
        "linkedin": "https://linkedin.com/in/elena-rostova-defense",
        "twitter": "https://twitter.com/elena_sec_ops",
        "website": "https://defenselabs.org",
        "company": "DefenseLabs Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/defenselabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_SEC02", "SESS_SEC04"]
      },
      {
        "speakerId": "SPK_SEC03",
        "name": "Bilal Siddiqui",
        "designation": "Lead Kernel Security Architect",
        "bio": "Bilal builds sandboxed runtime container wrappers engineered to neutralize system execution threats dynamically before state alterations occur.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/bilal_siddiqui.jpg",
        "sessionTitle": "Neutralizing Execution Exploits via Kernel Sandboxing Operations",
        "email": "bilal@sandboxed-systems.com",
        "linkedin": "https://linkedin.com/in/bilal-siddiqui-kernel",
        "twitter": "https://twitter.com/bilal_sandbox",
        "website": "https://sandboxed-systems.com",
        "company": "Sandboxed Systems Corp",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/sandboxed.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_SEC03"]
      },
      {
        "speakerId": "SPK_SEC04",
        "name": "Zainab Naqvi",
        "designation": "Supply Chain Security Auditor",
        "bio": "Zainab inspects downstream third party application injection vectors, defining secure repository ingestion standard rules.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zainab_naqvi.jpg",
        "sessionTitle": "Mitigating Third-Party Dependency Traps inside Enterprise Software Ingestion",
        "email": "z.naqvi@auditmesh.io",
        "linkedin": "https://linkedin.com/in/zainab-naqvi-audit",
        "twitter": "https://twitter.com/zainab_audit",
        "website": "https://auditmesh.io",
        "company": "AuditMesh Advisory Services",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/auditmesh.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_SEC04", "SESS_SEC05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_SEC01",
        "title": "Keynote: Tracing Cryptographic Vulnerabilities within Multi-Cloud Boundaries",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-12-14",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Zaver Hall Main Arena",
        "room": "Zone Alpha",
        "building": "Pearl Continental Center",
        "floor": "Ground Floor",
        "capacity": 300,
        "speakerNames": ["Taimoor Hassan"],
        "description": "A deep analysis tracing cross-tenant attack matrices targeting automated public key distribution structures inside interconnected platform infrastructures.",
        "activities": [
          { "time": "09:30-09:55", "description": "Reviewing data access exploits involving token generation flaws", "type": "presentation" },
          { "time": "09:55-10:40", "description": "Building continuous verification pathways over ephemeral identity mechanisms", "type": "presentation" },
          { "time": "10:40-11:00", "description": "Interactive system stress model open group discussion", "type": "discussion" }
        ],
        "notes": "No public recording allowed due to non-disclosure code displays.",
        "recordingUrl": "",
        "feedbackFormUrl": "https://forms.google.com/sec-sess-001",
        "isRecordingAvailable": false,
        "isRegistrationRequired": true,
        "maxAttendees": 300,
        "currentAttendees": 275,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SEC02",
        "title": "Deploying Dynamic Policy-Driven Access controls in Cluster Architectures",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-14",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Zaver Hall Sector B",
        "room": "Zone Beta",
        "building": "Pearl Continental Center",
        "floor": "Ground Floor",
        "capacity": 150,
        "speakerNames": ["Elena Rostova"],
        "description": "How to structure Open Policy Agent scripts that validate incoming network orchestration demands in real time before execution cycles occur.",
        "activities": [
          { "time": "11:30-12:15", "description": "Writing context-aware access validation schemas using declarative policy scripts", "type": "presentation" },
          { "time": "12:15-13:00", "description": "Validating multi-tenant cluster isolation rules under extreme payload traffic", "type": "presentation" }
        ],
        "notes": "Code samples distributed via secure storage links.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SEC02.mp4",
        "feedbackFormUrl": "https://forms.google.com/sec-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 138,
        "customFields": {
          "githubRepo": "https://github.com/defenselabs-org/dynamic-cluster-opa-policies"
        }
      },
      {
        "sessionId": "SESS_SEC03",
        "title": "Neutralizing Execution Exploits via Kernel Sandboxing Operations",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-12-14",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Defensive Sandbox Lab",
        "room": "Tech Suite 1",
        "building": "Pearl Continental Annex",
        "floor": "1st Floor",
        "capacity": 80,
        "speakerNames": ["Bilal Siddiqui"],
        "description": "Practical workshop deploying extended Berkeley Packet Filter programs to dynamically block bad system calls before they compromise operating layers.",
        "activities": [
          { "time": "14:30-15:00", "description": "Reviewing system execution tracing hooks and network packet event filters", "type": "presentation" },
          { "time": "15:00-15:45", "description": "Writing defensive monitoring scripts tracking unexpected memory modification hooks", "type": "workshop", "requirements": ["Linux environment with kernel 5.15+", "Root console permissions"] },
          { "time": "15:45-16:00", "description": "Simulating system infiltration events to verify policy isolation layers", "type": "workshop" }
        ],
        "notes": "Workstation setups are fully air-gapped from external networks.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SEC03.mp4",
        "feedbackFormUrl": "https://forms.google.com/sec-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 80,
        "currentAttendees": 78,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SEC04",
        "title": "Panel: Critical Infrastructure Resiliency Priorities",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-12-15",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Zaver Hall Main Arena",
        "room": "Zone Alpha",
        "building": "Pearl Continental Center",
        "floor": "Ground Floor",
        "capacity": 300,
        "speakerNames": ["Taimoor Hassan", "Elena Rostova", "Zainab Naqvi"],
        "description": "A serious discussion tracking response timelines when utility grids, supply chain hubs, or communication nets face orchestrated intrusion scenarios.",
        "activities": [
          { "time": "10:00-10:45", "description": "Cross-institutional defense communication models during network emergencies", "type": "discussion" },
          { "time": "10:45-11:30", "description": "Evaluating dynamic fallback structures that drop non-critical secondary components", "type": "discussion" }
        ],
        "notes": "Reserved exclusively for industry security operators.",
        "recordingUrl": "",
        "feedbackFormUrl": "https://forms.google.com/sec-sess-004",
        "isRecordingAvailable": false,
        "isRegistrationRequired": false,
        "maxAttendees": 300,
        "currentAttendees": 260,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SEC05",
        "title": "Mitigating Third-Party Dependency Traps inside Enterprise Software Ingestion",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-15",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Zaver Hall Sector B",
        "room": "Zone Beta",
        "building": "Pearl Continental Center",
        "floor": "Ground Floor",
        "capacity": 150,
        "speakerNames": ["Zainab Naqvi"],
        "description": "Constructing continuous delivery validation gates that automatically verify Software Bill of Materials tracking documents down to single package lines.",
        "activities": [
          { "time": "13:30-14:20", "description": "Mapping automated registry scanning routines against known package vulnerabilities database arrays", "type": "presentation" },
          { "time": "14:20-15:00", "description": "Establishing air-gapped compilation proxy structures inside corporate internal distribution networks", "type": "presentation" }
        ],
        "notes": "Provides compliance audit templates upon session completion.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SEC05.mp4",
        "feedbackFormUrl": "https://forms.google.com/sec-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 112,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_SEC01",
        "serviceCategory": "audiovisual",
        "description": "Encrypted secure closed loop presentation audio setup alongside high lumen display arrays.",
        "budget": 280000,
        "status": "assigned",
        "assignedVendorId": "VND_AV_003",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-09-12T09:00:00Z",
        "assignedAt": "2026-10-01T14:00:00Z",
        "completedAt": null,
        "notes": "Must guarantee zero broadcast signals leakage outside the immediate hall geometry boundaries."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-04T10:00:00Z",
    "updatedAt": "2026-10-01T14:00:00Z",
    "publishedAt": "2026-10-05T08:00:00Z",
    "eventStartTime": "2026-12-14T04:00:00Z",
    "eventEndTime": "2026-12-15T13:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_5k6l7m8n9o0p1q2r3s4t",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "B2B SaaS Growth & Product-Led Scaling Strategy Accelerator",
    "description": "An intensive management training seminar exploring user retention analysis frameworks, programmatic acquisition mechanics, automated customer journey mapping setups, and optimization methods for contract renewal models inside expanding software platforms.",
    "shortDescription": "Advanced strategies governing lifetime customer calculation values, outbound funnel mechanics, and expansion systems.",
    "category": "business",
    "eventType": "training",
    "format": "virtual",
    "language": "en",
    "schedule": {
      "startDate": "2026-11-04",
      "endDate": "2026-11-05",
      "startTime": "13:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "SaaS Accelerator Hub Portal",
      "address": "Online Delivery Platform",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8607,
        "longitude": 67.0011
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/saasaccelerate2026",
      "meetingId": "555-666-777",
      "meetingPassword": "product_led_growth",
      "parkingInfo": "Not applicable due to virtual presentation deployment design.",
      "accessibilityInfo": "Full digital accessibility controls alongside high contrast interface styling options available.",
      "nearbyHotels": [],
      "nearbyRestaurants": []
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/saas_growth_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/saas_dashboard.jpg",
      "https://storage.googleapis.com/event-assets/gallery/saas_group.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=saas_promo_2026",
    "capacity": {
      "totalSeats": 150,
      "reservedSeats": 20,
      "availableSeats": 130,
      "waitingListEnabled": true,
      "waitingListCapacity": 40,
      "maxRegistrationsPerUser": 4
    },
    "registration": {
      "registrationOpenDate": "2026-08-20",
      "registrationCloseDate": "2026-11-02",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "arr_range",
          "label": "Current Annual Recurring Revenue (ARR)",
          "type": "dropdown",
          "options": ["Pre-Revenue / Idea Stage", "Under $250k", "$250k - $1M", "Greater than $1M"],
          "required": true,
          "helpText": "Allows grouping management cohorts according to revenue operational realities"
        }
      ],
      "earlyBirdDeadline": "2026-09-25",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Single Operator Pass",
          "price": 9500,
          "availableUntil": "2026-11-02",
          "seats": 100,
          "description": "Includes standard virtual platform dashboard entry and access to downloadable model frameworks."
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
        "speakerId": "SPK_SAAS01",
        "name": "Khurram Zafar",
        "designation": "Managing Director of Growth Metrics",
        "bio": "Khurram scale structures outbound user acquisition engines, advising over 30 growth phase companies across continuous retention optimization loops.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/khurram_zafer.jpg",
        "sessionTitle": "Keynote: Deconstructing the Mechanics of Retention Decay Curves",
        "email": "khurram@growth-metrics.io",
        "linkedin": "https://linkedin.com/in/khurram-zafar-growth",
        "twitter": "https://twitter.com/khurram_saas",
        "website": "https://growth-metrics.io",
        "company": "Growth Metrics Advisors",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/growthmetrics.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_SAAS01", "SESS_SAAS04"]
      },
      {
        "speakerId": "SPK_SAAS02",
        "name": "Amina Baig",
        "designation": "Head of Product Experience Engineering",
        "bio": "Amina models custom onboarding activation tracks using continuous contextual telemetry to minimize initial product churn rates.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/amina_baig.jpg",
        "sessionTitle": "Building Low Friction Activation Funnels within Product Environments",
        "email": "amina.baig@saas-labs.net",
        "linkedin": "https://linkedin.com/in/amina-baig-product",
        "twitter": "https://twitter.com/amina_product",
        "website": "https://saas-labs.net",
        "company": "SaaS Labs Inc",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/saaslabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_SAAS02", "SESS_SAAS04"]
      },
      {
        "speakerId": "SPK_SAAS03",
        "name": "Raza Mikhael",
        "designation": "VP of Revenue Operations",
        "bio": "Raza specializes in price model iteration design strategies, transitioning structural platforms from primitive user counts into clean value usages.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/raza_mikhael.jpg",
        "sessionTitle": "Iterating Value-Based Price Models for Expansion Optimization",
        "email": "raza@revops-foundry.com",
        "linkedin": "https://linkedin.com/in/raza-mikhael-revops",
        "twitter": "https://twitter.com/raza_revops",
        "website": "https://revops-foundry.com",
        "company": "RevOps Foundry",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/revops.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_SAAS03"]
      },
      {
        "speakerId": "SPK_SAAS04",
        "name": "Sarah Mansoor",
        "designation": "Customer Success Data Analyst",
        "bio": "Sarah engineers structural early warning alerting pipelines predicting enterprise churn factors months before contract validation expirations arrive.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/sarah_mansoor.jpg",
        "sessionTitle": "Structuring Predictive Customer Churn Alerting Matrices via Usage Telemetry",
        "email": "s.mansoor@successdata.org",
        "linkedin": "https://linkedin.com/in/sarah-mansoor-success",
        "twitter": "https://twitter.com/sarah_success",
        "website": "https://successdata.org",
        "company": "SuccessData Insights",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/successdata.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_SAAS04", "SESS_SAAS05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_SAAS01",
        "title": "Keynote: Deconstructing the Mechanics of Retention Decay Curves",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-11-04",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Main Stage Portal",
        "room": "Stream Zone 1",
        "building": "Web Cloud Distribution",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Khurram Zafar"],
        "description": "A deeply analytical mathematical overview detailing cohort segmentation modeling frameworks required to isolate organic utility retention from short term promotional inflation.",
        "activities": [
          { "time": "13:30-14:00", "description": "Formulating cohort mathematical decay equations and modeling baseline stabilities", "type": "presentation" },
          { "time": "14:00-14:45", "description": "Isolating high velocity usage drops across feature configuration boundaries", "type": "presentation" },
          { "time": "14:45-15:00", "description": "Audience dynamic model evaluation and group diagnostic response", "type": "discussion" }
        ],
        "notes": "Workbook calculation matrices will stream via resources panel options.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SAAS01.mp4",
        "feedbackFormUrl": "https://forms.google.com/saas-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 122,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SAAS02",
        "title": "Building Low Friction Activation Funnels within Product Environments",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-04",
        "startTime": "15:30",
        "endTime": "17:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Second Stream Hall",
        "room": "Stream Zone 2",
        "building": "Web Cloud Distribution",
        "floor": "Not Applicable",
        "capacity": 100,
        "speakerNames": ["Amina Baig"],
        "description": "Structuring automated in-app onboarding pipelines designed to guide users straight toward core product value actions inside their very first execution session.",
        "activities": [
          { "time": "15:30-16:15", "description": "Mapping telemetry events to isolate drop-off points inside initial user settings steps", "type": "presentation" },
          { "time": "16:15-17:00", "description": "A/B setup experimentation strategies targeting immediate user configuration actions", "type": "presentation" }
        ],
        "notes": "Highly relevant for product managers and user design leads.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SAAS02.mp4",
        "feedbackFormUrl": "https://forms.google.com/saas-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 89,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SAAS03",
        "title": "Iterating Value-Based Price Models for Expansion Optimization",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-11-04",
        "startTime": "17:10",
        "endTime": "18:00",
        "duration": "50 minutes",
        "timezone": "PKT",
        "location": "Interactive Strategic Boardroom",
        "room": "Workshop Suite Alpha",
        "building": "Web Cloud Distribution",
        "floor": "Not Applicable",
        "capacity": 50,
        "speakerNames": ["Raza Mikhael"],
        "description": "Live simulation modeling that transforms static tiered pricing sheets into usage metrics tied straight into data processing or system storage thresholds.",
        "activities": [
          { "time": "17:10-17:35", "description": "Formulating value metric variables that naturally scale alongside enterprise growth", "type": "presentation" },
          { "time": "17:35-18:00", "description": "Calculating contract value shifts over historical usage distribution files", "type": "workshop", "requirements": ["Spreadsheet environment engine ready"] }
        ],
        "notes": "Seating limits apply tightly to preserve high teacher-student interactions.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SAAS03.mp4",
        "feedbackFormUrl": "https://forms.google.com/saas-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 50,
        "currentAttendees": 49,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SAAS04",
        "title": "Panel: Balancing Outbound Enterprise Sales with Self-Service Placements",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-11-05",
        "startTime": "14:00",
        "endTime": "15:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Main Stage Portal",
        "room": "Stream Zone 1",
        "building": "Web Cloud Distribution",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Khurram Zafar", "Amina Baig", "Sarah Mansoor"],
        "description": "Managing team transitions when combining developer self-service loops with high touch human validation processes targeted toward multi-million dollar contracts.",
        "activities": [
          { "time": "14:00-14:50", "description": "Debating lead routing criteria separating automated conversions from executive sales workflows", "type": "discussion" },
          { "time": "14:50-15:30", "description": "Open chat feed strategy alignment review deck processing", "type": "discussion" }
        ],
        "notes": "No presentation materials needed.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SAAS04.mp4",
        "feedbackFormUrl": "https://forms.google.com/saas-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 150,
        "currentAttendees": 135,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SAAS05",
        "title": "Structuring Predictive Customer Churn Alerting Matrices via Usage Telemetry",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-05",
        "startTime": "16:00",
        "endTime": "17:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Second Stream Hall",
        "room": "Stream Zone 2",
        "building": "Web Cloud Distribution",
        "floor": "Not Applicable",
        "capacity": 100,
        "speakerNames": ["Sarah Mansoor"],
        "description": "Connecting live analytics database arrays to look for silent contractions in core feature setups, letting success teams intervene well before renewal deadlines approach.",
        "activities": [
          { "time": "16:00-16:45", "description": "Weighting feature drop combinations to establish a composite system health metric scoring sheet", "type": "presentation" },
          { "time": "16:45-17:30", "description": "Case study overview tracking enterprise recovery timelines across real world operations", "type": "presentation" }
        ],
        "notes": "Best suited for customer success operations analysts and customer metrics officers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SAAS05.mp4",
        "feedbackFormUrl": "https://forms.google.com/saas-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 74,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_SAAS01",
        "serviceCategory": "custom",
        "description": "Dedicated digital communication manager to moderate live stream Q&A text feeds and triage incoming system access issues.",
        "budget": 45000,
        "status": "assigned",
        "assignedVendorId": "VND_MOD_002",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-25T10:00:00Z",
        "assignedAt": "2026-09-05T09:00:00Z",
        "completedAt": null,
        "notes": "Requires high comfort troubleshooting remote user video connection issues."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-05T14:00:00Z",
    "updatedAt": "2026-09-05T09:00:00Z",
    "publishedAt": "2026-09-10T11:00:00Z",
    "eventStartTime": "2026-11-04T08:00:00Z",
    "eventEndTime": "2026-11-05T13:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_3m4n5o6p7q8r9s0t1u2v",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Sustainable Urban Infrastructure & Smart Cities Forum 2026",
    "description": "A specialized cross-disciplinary summit analyzing modern municipal architecture modifications. Key themes explore grid system automation setups, carbon-neutral mass transportation layout strategies, decentralized stormwater collection systems engineering, and automated public sensor asset placement networks.",
    "shortDescription": "Designing next generation smart grids, zero-emission mass logistics, and automated municipal monitoring arrays.",
    "category": "networking",
    "eventType": "seminar",
    "format": "physical",
    "language": "en",
    "schedule": {
      "startDate": "2026-10-28",
      "endDate": "2026-10-29",
      "startTime": "09:00",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "NUST Main Seminar Hall",
      "address": "Scholars Avenue, H-12",
      "city": "Islamabad",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 33.6428,
        "longitude": 72.9926
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://smartcities.nust.edu.pk",
      "meetingId": "SMART2026",
      "meetingPassword": "green_infrastructure",
      "parkingInfo": "On-campus open parking zones designated explicitly for conference badge holders near Gate 3.",
      "accessibilityInfo": "Equipped with tactical guiding paths, ground-level entry portals, and dedicated step-free auditorium seating sections.",
      "nearbyHotels": [
        "The Envoy Continental",
        "Hotel de Papae",
        "Islamabad Regent Hotel"
      ],
      "nearbyRestaurants": [
        "Habibi Restaurant",
        "Kabul Restaurant",
        "Burning Brownie"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/smart_cities_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/urban_hall.jpg",
      "https://storage.googleapis.com/event-assets/gallery/urban_model.jpg",
      "https://storage.googleapis.com/event-assets/gallery/urban_lab.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=urban_promo_2026",
    "capacity": {
      "totalSeats": 200,
      "reservedSeats": 30,
      "availableSeats": 170,
      "waitingListEnabled": true,
      "waitingListCapacity": 30,
      "maxRegistrationsPerUser": 2
    },
    "registration": {
      "registrationOpenDate": "2026-08-05",
      "registrationCloseDate": "2026-10-25",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "professional_domain",
          "label": "Primary Operational Focus Area",
          "type": "dropdown",
          "options": ["Urban Planning Consultant", "Civil Engineer / Contractor", "Environmental Researcher", "Municipal Representative", "Student / Academic Observer"],
          "required": true,
          "helpText": "Helps customize networking breakout assignments matching your professional interests"
        }
      ],
      "earlyBirdDeadline": "2026-09-20",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "General Delegate Registration Pass",
          "price": 6000,
          "availableUntil": "2026-10-25",
          "seats": 140,
          "description": "Covers access to presentation forums, panel stages, exhibition spaces, and lunch arrangements."
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
        "speakerId": "SPK_URB01",
        "name": "Dr. Omair Khadmani",
        "designation": "Professor of Sustainable Urbanism",
        "bio": "Dr. Omair structural maps high density community development setups, advising municipal development corporations across ecological layout adjustments.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/omair_khadmani.jpg",
        "sessionTitle": "Keynote: Designing High-Density Habitats for Climate Resilience",
        "email": "omair.khadmani@nust.edu.pk",
        "linkedin": "https://linkedin.com/in/omair-khadmani-urban",
        "twitter": "https://twitter.com/omair_urbanism",
        "website": "https://nust.edu.pk",
        "company": "NUST School of Civil Engineering",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/nust.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_URB01", "SESS_URB04"]
      },
      {
        "speakerId": "SPK_URB02",
        "name": "Sarah Lindqvist",
        "designation": "Lead Smart Grid Architect",
        "bio": "Sarah models electrical distribution grids using real-time sensory inputs to dynamically re-route load distribution across local generation pools.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/sarah_lindqvist.jpg",
        "sessionTitle": "Deploying Dynamic Grid Infrastructure Options inside Expanding Metropolises",
        "email": "s.lindqvist@power-networks.se",
        "linkedin": "https://linkedin.com/in/sarah-lindqvist-energy",
        "twitter": "https://twitter.com/sarah_grids",
        "website": "https://power-networks.se",
        "company": "PowerNetworks Scandinavia",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/powernetworks.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_URB02", "SESS_URB04"]
      },
      {
        "speakerId": "SPK_URB03",
        "name": "Kamaluddin Ahmed",
        "designation": "Director of Municipal Mass Transportation",
        "bio": "Kamaluddin tracks zero-emission scheduling logistics platforms, modernizing rapid public transport frameworks inside highly congested urban sectors.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/kamaluddin_ahmed.jpg",
        "sessionTitle": "Transitioning to Zero-Emission Mass Logistics: Empirical Data and Timelines",
        "email": "kamal.ahmed@municipaltrans.gov.pk",
        "linkedin": "https://linkedin.com/in/kamaluddin-ahmed-transit",
        "twitter": "https://twitter.com/kamal_transit",
        "website": "https://municipaltrans.gov.pk",
        "company": "Municipal Mass Transportation Council",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/mmtc.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_URB03"]
      },
      {
        "speakerId": "SPK_URB04",
        "name": "Zoya Malik",
        "designation": "Environmental Water Management Analyst",
        "bio": "Zoya coordinates structural implementations targeting sustainable urban water reclamation frameworks to curb seasonal local flash flood hazards.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zoya_malik.jpg",
        "sessionTitle": "Decentralized Stormwater Collection Layout Patterns: Curbing Flood Realities",
        "email": "zoya.malik@eco-hydrology.org",
        "linkedin": "https://linkedin.com/in/zoya-malik-hydrology",
        "twitter": "https://twitter.com/zoya_hydrology",
        "website": "https://eco-hydrology.org",
        "company": "Eco-Hydrology Systems Institute",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/ecohydrology.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_URB04", "SESS_URB05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_URB01",
        "title": "Keynote: Designing High-Density Habitats for Climate Resilience",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-10-28",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NUST Auditorium Main Stage",
        "room": "Hall Alpha",
        "building": "Engineering Sciences Block",
        "floor": "Ground Floor",
        "capacity": 200,
        "speakerNames": ["Dr. Omair Khadmani"],
        "description": "An architectural review exploring modifications to structural codes required to counter rapid temperature spikes and torrential localized precipitation profiles.",
        "activities": [
          { "time": "09:30-10:00", "description": "Reviewing thermal absorption index patterns across varied masonry styles", "type": "presentation" },
          { "time": "10:00-10:40", "description": "Modeling naturally cooled structural ventilation loops and layout shading orientations", "type": "presentation" },
          { "time": "10:40-11:00", "description": "Strategic dialogue focusing on updating building control regulations", "type": "discussion" }
        ],
        "notes": "Presentation models will archive onto internal academic libraries for access.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_URB01.mp4",
        "feedbackFormUrl": "https://forms.google.com/urb-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 200,
        "currentAttendees": 182,
        "customFields": {}
      },
      {
        "sessionId": "SESS_URB02",
        "title": "Deploying Dynamic Grid Infrastructure Options inside Expanding Metropolises",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-28",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NUST Seminar Annex Room",
        "room": "Room 102",
        "building": "Engineering Sciences Block",
        "floor": "1st Floor",
        "capacity": 100,
        "speakerNames": ["Sarah Lindqvist"],
        "description": "How to map edge telemetry nodes across regional sub-stations to dynamically balancing solar generation outputs against commercial consumer cooling load draws.",
        "activities": [
          { "time": "11:30-12:20", "description": "Formulating load balancing algorithmic logic protocols across real-time grids", "type": "presentation" },
          { "time": "12:20-13:00", "description": "Reviewing field test metrics showing stability performance improvements", "type": "presentation" }
        ],
        "notes": "Meant primarily for systems engineers and electrical infrastructure coordinators.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_URB02.mp4",
        "feedbackFormUrl": "https://forms.google.com/urb-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 94,
        "customFields": {}
      },
      {
        "sessionId": "SESS_URB03",
        "title": "Transitioning to Zero-Emission Mass Logistics: Empirical Data and Timelines",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-10-28",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Urban Simulation Laboratory",
        "room": "Lab Suite C",
        "building": "Civil Transport Block",
        "floor": "Basement",
        "capacity": 60,
        "speakerNames": ["Kamaluddin Ahmed"],
        "description": "Simulating traffic congestion impacts and route optimization metrics when charging infrastructure cycles are embedded directly into bus transit networks.",
        "activities": [
          { "time": "14:30-15:00", "description": "Modeling vehicle battery draw down distributions across hilly topography profiles", "type": "presentation" },
          { "time": "15:00-15:45", "description": "Simulating fleet transit timelines using geospatial software layers", "type": "workshop", "requirements": ["QGIS desktop installed pre-session", "Cloned regional map vectors"] },
          { "time": "15:45-16:00", "description": "Evaluating budget allocation trajectories against carbon reduction results", "type": "workshop" }
        ],
        "notes": "Dataset packages will hand out via physical thumb drive options at the entry point.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_URB03.mp4",
        "feedbackFormUrl": "https://forms.google.com/urb-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 60,
        "currentAttendees": 58,
        "customFields": {
          "gisDataPackage": "https://storage.googleapis.com/event-exercises/islamabad_transit_vectors.zip"
        }
      },
      {
        "sessionId": "SESS_URB04",
        "title": "Panel: Inter-Agency Friction Points in Smart Governance Implementations",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-10-29",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NUST Auditorium Main Stage",
        "room": "Hall Alpha",
        "building": "Engineering Sciences Block",
        "floor": "Ground Floor",
        "capacity": 200,
        "speakerNames": ["Dr. Omair Khadmani", "Sarah Lindqvist", "Zoya Malik"],
        "description": "Aligning data access criteria, mapping environmental variables, and unifying separate municipal zoning parameters across single dashboards.",
        "activities": [
          { "time": "10:00-10:50", "description": "Debating jurisdictional ownership barriers across interlinked utility tracking frameworks", "type": "discussion" },
          { "time": "10:50-11:30", "description": "Audience floor discussion regarding privacy protection rules over sensory nets", "type": "discussion" }
        ],
        "notes": "Open delegate forum access applies.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_URB04.mp4",
        "feedbackFormUrl": "https://forms.google.com/urb-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 200,
        "currentAttendees": 170,
        "customFields": {}
      },
      {
        "sessionId": "SESS_URB05",
        "title": "Decentralized Stormwater Collection Layout Patterns: Curbing Flood Realities",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-10-29",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NUST Seminar Annex Room",
        "room": "Room 102",
        "building": "Engineering Sciences Block",
        "floor": "1st Floor",
        "capacity": 100,
        "speakerNames": ["Zoya Malik"],
        "description": "Replacing problematic linear concrete rainwater canals with localized retention wetlands, bioswales, and porous pavement layouts.",
        "activities": [
          { "time": "13:30-14:15", "description": "Reviewing retention capabilities indices from operational permeable surface arrays", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Calculating run-off reductions metrics inside urban zoning sectors during storm surges", "type": "presentation" }
        ],
        "notes": "Essential session for spatial design specialists and structural engineers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_URB05.mp4",
        "feedbackFormUrl": "https://forms.google.com/urb-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 85,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_URB01",
        "serviceCategory": "printing",
        "description": "Printing high-resolution structural blueprint model posters and dynamic mapping guides for delegate distribution packs.",
        "budget": 65000,
        "status": "assigned",
        "assignedVendorId": "VND_PRN_110",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-10T11:00:00Z",
        "assignedAt": "2026-09-02T16:00:00Z",
        "completedAt": null,
        "notes": "Requires high durability matte heavy weight stock options to preserve drawing scales accurately."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-05T16:00:00Z",
    "updatedAt": "2026-09-02T16:00:00Z",
    "publishedAt": "2026-09-06T10:00:00Z",
    "eventStartTime": "2026-10-28T04:00:00Z",
    "eventEndTime": "2026-10-29T12:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_4o5p6q7r8s9t0u1v2w3x",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Machine Learning Platform Engineering & MLOps Infrastructure Intensive",
    "description": "A deeply technical 2-day workshop targeting scalable training pipelines. Focus zones cover automated feature store synchronization, pipeline data lineage validation patterns, cost-optimized graphic processor provisioning algorithms, and low-latency continuous delivery paths for multi-billion parameter large weight systems models.",
    "shortDescription": "Deploying scalable automated data engineering, GPU cluster configuration matrices, and distributed system model testing arrays.",
    "category": "technology",
    "eventType": "workshop",
    "format": "hybrid",
    "language": "en",
    "schedule": {
      "startDate": "2026-11-12",
      "endDate": "2026-11-13",
      "startTime": "09:00",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "FAST-NUCES Computer Science Complex",
      "address": "Shah Latif Town, National Highway",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8569,
        "longitude": 67.2647
      },
      "meetingPlatform": "Zoom",
      "meetingLink": "https://zoom.us/j/mlopsintensive2026",
      "meetingId": "444-555-666",
      "meetingPassword": "pipelining_at_scale",
      "parkingInfo": "Dedicated university visitor lot entrance available via South Campus Main Gate.",
      "accessibilityInfo": "Equipped with ground-floor step-free laboratory access options and wide elevator infrastructure controls.",
      "nearbyHotels": [
        "Ramada Plaza by Wyndham Karachi Airport",
        "Hotel Sky Towers",
        "Airport Hotel Karachi"
      ],
      "nearbyRestaurants": [
        "Sajjad Restaurant Highway",
        "Al-Habib Restaurant",
        "Do Darya Food Street"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/mlops_2026_hero.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/mlops_lab.jpg",
      "https://storage.googleapis.com/event-assets/gallery/mlops_cluster.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=mlops_promo_2026",
    "capacity": {
      "totalSeats": 120,
      "reservedSeats": 20,
      "availableSeats": 100,
      "waitingListEnabled": true,
      "waitingListCapacity": 40,
      "maxRegistrationsPerUser": 2
    },
    "registration": {
      "registrationOpenDate": "2026-08-15",
      "registrationCloseDate": "2026-11-08",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "kubernetes_comfort",
          "label": "Kubernetes Operational Familiarity",
          "type": "dropdown",
          "options": ["None / Basic Concepts", "Intermediate (Deploying Apps)", "Advanced (Managing Clusters, Custom Operators)"],
          "required": true,
          "helpText": "Crucial indicator as multiple modules rely extensively on cloud cluster terminal manipulations"
        }
      ],
      "earlyBirdDeadline": "2026-09-30",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Technical Engineering Registration Pass",
          "price": 8500,
          "availableUntil": "2026-11-08",
          "seats": 100,
          "description": "Covers personal cloud sandbox infrastructure allocations, digital workbook guides, and daily lunch buffers."
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 50,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 3,
        "percentage": 10
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_OPS01",
        "name": "Dr. Fahad Sherwani",
        "designation": "Associate Director of Infrastructure Research",
        "bio": "Dr. Fahad designs scale distributed high volume batch training systems formerly operating within large compute nodes globally.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/fahad_sherwani.jpg",
        "sessionTitle": "Keynote: Mitigating Cascading Data Drift Mutations across Live Production Environments",
        "email": "fahad.sherwani@fast.nu.edu.pk",
        "linkedin": "https://linkedin.com/in/fahad-sherwani-mlops",
        "twitter": "https://twitter.com/sherwani_ops",
        "website": "https://fast.nu.edu.pk",
        "company": "FAST-NUCES AI Research Lab",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/fast_logo.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_OPS01", "SESS_OPS04"]
      },
      {
        "speakerId": "SPK_OPS02",
        "name": "Vikram Dev",
        "designation": "Principal MLOps Platform Architect",
        "bio": "Vikram scale-deploys automated cloud training mesh patterns optimizing custom cluster controllers for multi-region node frameworks.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/vikram_dev.jpg",
        "sessionTitle": "Structuring Low-Latency Multi-Region Model Registry Framework Layers",
        "email": "vikram.dev@computemesh.net",
        "linkedin": "https://linkedin.com/in/vikram-dev-compute",
        "twitter": "https://twitter.com/vikram_compute",
        "website": "https://computemesh.net",
        "company": "ComputeMesh Solutions",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/computemesh.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_OPS02", "SESS_OPS04"]
      },
      {
        "speakerId": "SPK_OPS03",
        "name": "Siddharth Mehta",
        "designation": "Lead Data Pipeline Engineer",
        "bio": "Siddharth codes micro-second streaming feature computation arrays parsing multi-gigabit user behavioral logs inside active memory layers.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/siddharth_mehta.jpg",
        "sessionTitle": "Engineering Sub-Second Dynamic Feature Computation Arrays at Scale",
        "email": "sid.mehta@datarefinery.io",
        "linkedin": "https://linkedin.com/in/siddharth-mehta-data",
        "twitter": "https://twitter.com/sid_dataops",
        "website": "https://datarefinery.io",
        "company": "DataRefinery Labs",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/datarefinery.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_OPS03"]
      },
      {
        "speakerId": "SPK_OPS04",
        "name": "Nida Fatima",
        "designation": "Quantization Performance Auditor",
        "bio": "Nida compacts weight layers down to lower bit configurations to streamline deployments into mobile edge processors without destroying model utility profiles.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/nida_fatima.jpg",
        "sessionTitle": "Deploying Compressed Multi-Billion Parameter Weight Modules onto Constrained Hardware",
        "email": "nida.fatima@edgecompute.org",
        "linkedin": "https://linkedin.com/in/nida-fatima-edge",
        "twitter": "https://twitter.com/nida_edge_ai",
        "website": "https://edgecompute.org",
        "company": "EdgeCompute Foundations",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/edgecompute.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_OPS04", "SESS_OPS05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_OPS01",
        "title": "Keynote: Mitigating Cascading Data Drift Mutations across Live Production Environments",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-11-12",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Seminar Auditorium",
        "room": "Auditorium Hall A",
        "building": "Computer Science Complex",
        "floor": "Ground Floor",
        "capacity": 120,
        "speakerNames": ["Dr. Fahad Sherwani"],
        "description": "Formulating statistical baseline evaluation metrics inside active ingestion loops to detect context distribution alterations before inference metrics erode.",
        "activities": [
          { "time": "09:30-10:00", "description": "Analyzing real-world tracking anomalies generated by silent upstream layout modifications", "type": "presentation" },
          { "time": "10:00-10:45", "description": "Constructing dynamic threshold triggers utilizing continuous population stability indices", "type": "presentation" },
          { "time": "10:45-11:00", "description": "Open group strategy debate surrounding automated rollout rollbacks", "type": "discussion" }
        ],
        "notes": "Session presentation recording will sync onto student platform portals afterward.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_OPS01.mp4",
        "feedbackFormUrl": "https://forms.google.com/ops-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 120,
        "currentAttendees": 98,
        "customFields": {}
      },
      {
        "sessionId": "SESS_OPS02",
        "title": "Structuring Low-Latency Multi-Region Model Registry Framework Layers",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-12",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Systems Engineering Lab",
        "room": "Lab Suite 3",
        "building": "Computer Science Complex",
        "floor": "1st Floor",
        "capacity": 60,
        "speakerNames": ["Vikram Dev"],
        "description": "How to structure distributed object caching arrays across distant cloud regions to guarantee localized cluster nodes can hot swap runtime model states instantly.",
        "activities": [
          { "time": "11:30-12:15", "description": "Reviewing data replication latency profiles and dynamic storage routing logic maps", "type": "presentation" },
          { "time": "12:15-13:00", "description": "Configuring persistent multi-region image synchronization configurations live", "type": "presentation" }
        ],
        "notes": "Requires foundational knowledge handling large chunk memory blocks.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_OPS02.mp4",
        "feedbackFormUrl": "https://forms.google.com/ops-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 60,
        "currentAttendees": 56,
        "customFields": {
          "githubRepo": "https://github.com/computemesh-solutions/multi-region-registry-sync"
        }
      },
      {
        "sessionId": "SESS_OPS03",
        "title": "Engineering Sub-Second Dynamic Feature Computation Arrays at Scale",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-11-12",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Advanced Computing Annex",
        "room": "Lab Suite 5",
        "building": "Computer Science Complex",
        "floor": "2nd Floor",
        "capacity": 50,
        "speakerNames": ["Siddharth Mehta"],
        "description": "Practical setup writing continuous streaming logic loops inside active memory caching blocks to transform raw web hits into processed features immediately.",
        "activities": [
          { "time": "14:30-15:00", "description": "Formulating structural processing timelines over complex un-ordered session event records", "type": "presentation" },
          { "time": "15:00-15:45", "description": "Coding streaming processing scripts hooked straight into mock log distribution nodes", "type": "workshop", "requirements": ["Docker ready", "Java or Python execution stacks up"] },
          { "time": "15:45-16:00", "description": "Validating processing delays under synthetic peak traffic loads anomalies", "type": "workshop" }
        ],
        "notes": "Ensure sandbox cluster passwords sent via email are verified beforehand.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_OPS03.mp4",
        "feedbackFormUrl": "https://forms.google.com/ops-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 50,
        "currentAttendees": 48,
        "customFields": {
          "githubRepo": "https://github.com/datarefinery-labs/streaming-feature-store-demo"
        }
      },
      {
        "sessionId": "SESS_OPS04",
        "title": "Panel: Resource Efficiency Constraints across Modern Compute Scale Realities",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-11-13",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Main Seminar Auditorium",
        "room": "Auditorium Hall A",
        "building": "Computer Science Complex",
        "floor": "Ground Floor",
        "capacity": 120,
        "speakerNames": ["Dr. Fahad Sherwani", "Vikram Dev", "Nida Fatima"],
        "description": "Coordinating optimization paths when massive cluster pricing trends demand rigid dynamic down-scaling rules across non-peak computational hours.",
        "activities": [
          { "time": "10:00-10:50", "description": "Debating managed spot tier instance eviction patterns versus model execution guarantees", "type": "discussion" },
          { "time": "10:50-11:30", "description": "Audience floor submission reviews surrounding container scheduling optimization rules", "type": "discussion" }
        ],
        "notes": "Open to all registered attendee paths.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_OPS04.mp4",
        "feedbackFormUrl": "https://forms.google.com/ops-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 120,
        "currentAttendees": 105,
        "customFields": {}
      },
      {
        "sessionId": "SESS_OPS05",
        "title": "Deploying Compressed Multi-Billion Parameter Weight Modules onto Constrained Hardware",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-13",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Systems Engineering Lab",
        "room": "Lab Suite 3",
        "building": "Computer Science Complex",
        "floor": "1st Floor",
        "capacity": 60,
        "speakerNames": ["Nida Fatima"],
        "description": "Deep overview detailing modern post-training quantization matrices that reduce numerical precision scaling boundaries without dropping base intelligence marks.",
        "activities": [
          { "time": "13:30-14:15", "description": "Formulating structural block-wise weight quantization functions and tracking error deviations", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Measuring comparative profiling latencies across real edge system environments", "type": "presentation" }
        ],
        "notes": "Essential content for embedded systems optimization paths and mobile application innovators.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_OPS05.mp4",
        "feedbackFormUrl": "https://forms.google.com/ops-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 60,
        "currentAttendees": 52,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_OPS01",
        "serviceCategory": "custom",
        "description": "Allocation of remote high-performance ephemeral cloud sandbox accounts featuring functional virtual terminal setups.",
        "budget": 220000,
        "status": "assigned",
        "assignedVendorId": "VND_CLD_909",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-20T09:00:00Z",
        "assignedAt": "2026-09-15T11:00:00Z",
        "completedAt": null,
        "notes": "Must guarantee proper tracking isolation parameters to ensure zero cross-talk vulnerabilities between student sandboxes."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-05T18:00:00Z",
    "updatedAt": "2026-09-15T11:00:00Z",
    "publishedAt": "2026-09-18T10:00:00Z",
    "eventStartTime": "2026-11-12T04:00:00Z",
    "eventEndTime": "2026-11-13T12:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_6p7q8r9s0t1u2v3w4x5y",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Decentralized Healthcare Data Networks & Blockchain Systems Training",
    "description": "A dense technical certification seminar focusing on immutable medical record architecture designs. Topics drill deep into zero-knowledge patient data proofs, multi-institutional consensus fabrics, distributed ledger access control validation paths, and dynamic compliance auditing tools.",
    "shortDescription": "Implementing cryptographic ledger privacy layers, medical metadata tracking schemas, and secure cross-border sync paths.",
    "category": "healthcare",
    "eventType": "training",
    "format": "virtual",
    "language": "en",
    "schedule": {
      "startDate": "2026-11-25",
      "endDate": "2026-11-26",
      "startTime": "10:00",
      "endTime": "16:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Secure Health Portal",
      "address": "Online Training Node Hub",
      "city": "Islamabad",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 33.6844,
        "longitude": 73.0479
      },
      "meetingPlatform": "Microsoft Teams",
      "meetingLink": "https://teams.microsoft.com/l/meetup-join/healthchain2026",
      "meetingId": "888-999-000",
      "meetingPassword": "cryptographic_records",
      "parkingInfo": "Not applicable due to remote virtual infrastructure delivery formats.",
      "accessibilityInfo": "Full screen reader accessibility profiles paired with real time interactive text caption channels verified.",
      "nearbyHotels": [],
      "nearbyRestaurants": []
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/health_chain_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/hchain_ui.jpg",
      "https://storage.googleapis.com/event-assets/gallery/hchain_flow.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=hchain_promo_2026",
    "capacity": {
      "totalSeats": 200,
      "reservedSeats": 25,
      "availableSeats": 175,
      "waitingListEnabled": true,
      "waitingListCapacity": 30,
      "maxRegistrationsPerUser": 3
    },
    "registration": {
      "registrationOpenDate": "2026-09-01",
      "registrationCloseDate": "2026-11-22",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "crypto_experience",
          "label": "Cryptographic Concepts Familiarity",
          "type": "dropdown",
          "options": ["Beginner (Understand Hashing)", "Intermediate (Understand Asymmetric Keys)", "Advanced (Can program consensus rules)"],
          "required": true,
          "helpText": "Aiding dynamic assignments for lab pairing operations"
        }
      ],
      "earlyBirdDeadline": "2026-10-15",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Standard Access License",
          "price": 5500,
          "availableUntil": "2026-11-22",
          "seats": 150,
          "description": "Includes platform credential token delivery alongside verified course completion records."
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
        "percentage": 15
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_HC01",
        "name": "Dr. Sameer Jahangir",
        "designation": "Lead Ledger Security Researcher",
        "bio": "Dr. Sameer architectures zero-knowledge framework layers designed explicitly to isolate private clinical metrics from public validation nodes.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/sameer_jahangir.jpg",
        "sessionTitle": "Keynote: Formulating Zero-Knowledge Assertions over Restricted Medical Registries",
        "email": "sameer.j@crypto-health.org",
        "linkedin": "https://linkedin.com/in/sameer-jahangir-crypto",
        "twitter": "https://twitter.com/sameer_ledger",
        "website": "https://crypto-health.org",
        "company": "CryptoHealth Foundations Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/cryptohealth.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_HC01", "SESS_HC04"]
      },
      {
        "speakerId": "SPK_HC02",
        "name": "Naomi West",
        "designation": "Principal Enterprise Systems Architect",
        "bio": "Naomi codes highly specialized multi-tenant smart contract modules enforcing rigid identity constraints across cross-border medical diagnostic pipelines.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/naomi_west.jpg",
        "sessionTitle": "Deploying Dynamic Permission Fabrics across Interconnected Hospital Chains",
        "email": "n.west@secure-records.io",
        "linkedin": "https://linkedin.com/in/naomi-west-records",
        "twitter": "https://twitter.com/naomi_tech_labs",
        "website": "https://secure-records.io",
        "company": "SecureRecords Architecture Corp",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/securerecords.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_HC02", "SESS_HC04"]
      },
      {
        "speakerId": "SPK_HC03",
        "name": "Faisal Baloch",
        "designation": "Lead Compliance Infrastructure Engineer",
        "bio": "Faisal engineers automated real-time transaction query logging arrays ensuring system operations remain fully compliant with HIPAA privacy protocols.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/faisal_baloch.jpg",
        "sessionTitle": "Automating Real-Time Distributed Auditing Chains under Rigid Regulatory Frameworks",
        "email": "faisal@compliance-mesh.net",
        "linkedin": "https://linkedin.com/in/faisal-baloch-compliance",
        "twitter": "https://twitter.com/faisal_audit",
        "website": "https://compliance-mesh.net",
        "company": "ComplianceMesh Consulting",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/compliancemesh.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_HC03"]
      },
      {
        "speakerId": "SPK_HC04",
        "name": "Dr. Aliyah Malik",
        "designation": "Director of Medical Informatics Research",
        "bio": "Dr. Aliyah builds standardized medical metadata taxonomy storage models to structure unstructured multi-institutional diagnostic arrays seamlessly.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/aliyah_malik.jpg",
        "sessionTitle": "Standardizing Decentralized Patient Schema Dictionaries for Frictionless Data Ingestion",
        "email": "aliyah.malik@informatics-labs.org",
        "linkedin": "https://linkedin.com/in/aliyah-malik-informatics",
        "twitter": "https://twitter.com/aliyah_meddata",
        "website": "https://informatics-labs.org",
        "company": "Informatics Labs International",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/informaticslabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_HC04", "SESS_HC05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_HC01",
        "title": "Keynote: Formulating Zero-Knowledge Assertions over Restricted Medical Registries",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-11-25",
        "startTime": "10:30",
        "endTime": "12:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Main Stage Node",
        "room": "Stream Zone Alpha",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 200,
        "speakerNames": ["Dr. Sameer Jahangir"],
        "description": "Constructing dynamic cryptographic proving circuits allowing patients to validate system authorization parameters without ever exposing target health indices.",
        "activities": [
          { "time": "10:30-11:00", "description": "Reviewing core mathematical formulations governing modern snark circuit layers", "type": "presentation" },
          { "time": "11:00-11:45", "description": "Analyzing structural computation constraints across complex nested verification arrays", "type": "presentation" },
          { "time": "11:45-12:00", "description": "Answering audience submitted queries via live terminal messaging dashboards", "type": "discussion" }
        ],
        "notes": "Session presentation slides will drop into the dynamic user download folders immediately.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HC01.mp4",
        "feedbackFormUrl": "https://forms.google.com/hc-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 200,
        "currentAttendees": 164,
        "customFields": {}
      },
      {
        "sessionId": "SESS_HC02",
        "title": "Deploying Dynamic Permission Fabrics across Interconnected Hospital Chains",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-25",
        "startTime": "13:00",
        "endTime": "14:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Second Stream Hub",
        "room": "Stream Zone Beta",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 120,
        "speakerNames": ["Naomi West"],
        "description": "How to structure permission trees inside Hyperledger Fabric frameworks to orchestrate dynamic data sharing profiles across autonomous entity boundaries.",
        "activities": [
          { "time": "13:00-13:45", "description": "Writing chaincode functions validating real-time multi-signature identity structures", "type": "presentation" },
          { "time": "13:45-14:30", "description": "Evaluating execution block time latencies across multi-node consensus validation grids", "type": "presentation" }
        ],
        "notes": "Recommended for enterprise systems developers and hospital database administrators.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HC02.mp4",
        "feedbackFormUrl": "https://forms.google.com/hc-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 120,
        "currentAttendees": 112,
        "customFields": {
          "githubRepo": "https://github.com/securerecords-corp/hyperledger-medical-permission-fabric"
        }
      },
      {
        "sessionId": "SESS_HC03",
        "title": "Automating Real-Time Distributed Auditing Chains under Rigid Regulatory Frameworks",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-11-25",
        "startTime": "14:45",
        "endTime": "16:00",
        "duration": "75 minutes",
        "timezone": "PKT",
        "location": "Virtual Interactive Coding Lab",
        "room": "Stream Zone Gamma",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 80,
        "speakerNames": ["Faisal Baloch"],
        "description": "Hands-on engineering session setting up continuous log collectors that compile immutable tracking signatures straight into private blocks.",
        "activities": [
          { "time": "14:45-15:15", "description": "Structuring cryptographically linked state log generators inside api gateway layers", "type": "presentation" },
          { "time": "15:15-16:00", "description": "Deploying compliance event collectors and running validation scripts live", "type": "workshop", "requirements": ["Docker ready console", "Go programming environment configured"] }
        ],
        "notes": "Verify pre-registration access key codes prior to the workshop execution sequence.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HC03.mp4",
        "feedbackFormUrl": "https://forms.google.com/hc-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 80,
        "currentAttendees": 74,
        "customFields": {
          "githubRepo": "https://github.com/compliancemesh-net/immutable-audit-logger"
        }
      },
      {
        "sessionId": "SESS_HC04",
        "title": "Panel: Interoperability Blockers Across Sovereign Healthcare Boundaries",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-11-26",
        "startTime": "11:00",
        "endTime": "12:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Main Stage Node",
        "room": "Stream Zone Alpha",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 200,
        "speakerNames": ["Dr. Sameer Jahangir", "Naomi West", "Dr. Aliyah Malik"],
        "description": "Navigating data structural variation limits, legal export blocks, and local data residency commands when connecting tracking nodes globally.",
        "activities": [
          { "time": "11:00-11:50", "description": "Debating international compliance standardization limits across discrete clinical networks", "type": "discussion" },
          { "time": "11:50-12:30", "description": "Open chat board reviews tracing practical field implementation bottlenecks", "type": "discussion" }
        ],
        "notes": "No materials required for general observation tracks.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HC04.mp4",
        "feedbackFormUrl": "https://forms.google.com/hc-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 200,
        "currentAttendees": 158,
        "customFields": {}
      },
      {
        "sessionId": "SESS_HC05",
        "title": "Standardizing Decentralized Patient Schema Dictionaries for Frictionless Data Ingestion",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-26",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Second Stream Hub",
        "room": "Stream Zone Beta",
        "building": "Cloud Infrastructure",
        "floor": "Not Applicable",
        "capacity": 120,
        "speakerNames": ["Dr. Aliyah Malik"],
        "description": "Constructing robust data dictionary structures based on international HL7 FHIR protocols to translate disparate localized clinical definitions cleanly on ingestion.",
        "activities": [
          { "time": "13:30-14:15", "description": "Mapping structural schema transformations over heterogenous hospital database formats", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Automating metadata lineage extraction pipelines across federated tracking environments", "type": "presentation" }
        ],
        "notes": "Essential training for data platform leads and clinical database engineers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HC05.mp4",
        "feedbackFormUrl": "https://forms.google.com/hc-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 120,
        "currentAttendees": 92,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_HC01",
        "serviceCategory": "custom",
        "description": "Professional virtual host service array to manage streaming server distributions and compile system analytics files.",
        "budget": 50000,
        "status": "assigned",
        "assignedVendorId": "VND_MOD_005",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-09-10T14:00:00Z",
        "assignedAt": "2026-09-28T10:00:00Z",
        "completedAt": null,
        "notes": "Requires strict encryption protocols enabled over all administrative tracking control paths."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-06T11:00:00Z",
    "updatedAt": "2026-09-28T10:00:00Z",
    "publishedAt": "2026-10-02T09:00:00Z",
    "eventStartTime": "2026-11-25T05:00:00Z",
    "eventEndTime": "2026-11-26T11:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_7q8r9s0t1u2v3w4x5y6z",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Advanced Algorithmic Trading Architectures & High-Frequency Systems",
    "description": "An intensive engineering conference analyzing sub-millisecond execution architectures. Core areas focus on low-latency memory pipeline setups, kernel-bypass network card programming, dynamic real-time arbitrage calculation models, and resilient circuit breaker infrastructure protocols.",
    "shortDescription": "Mastering sub-millisecond trading loops, FPGA hardware acceleration setups, and ultra-low latency system pathways.",
    "category": "business",
    "eventType": "conference",
    "format": "physical",
    "language": "en",
    "schedule": {
      "startDate": "2026-12-18",
      "endDate": "2026-12-19",
      "startTime": "09:00",
      "endTime": "18:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Movenpick Executive Suite Hall",
      "address": "Club Road, Civil Lines",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8472,
        "longitude": 67.0334
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://hft-portal.systems-scale.io",
      "meetingId": "HFT2026",
      "meetingPassword": "sub_millisecond_loops",
      "parkingInfo": "Complimentary valet parking tokens provided at registration reception counters.",
      "accessibilityInfo": "Fully integrated mobility support layouts with ground floor step-free seminar spaces confirmed.",
      "nearbyHotels": [
        "Pearl Continental Hotel Karachi",
        "Avari Towers Karachi"
      ],
      "nearbyRestaurants": [
        "The Marquee Restaurant",
        "Okra Restaurant"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/hft_2026_banner.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/hft_stage.jpg",
      "https://storage.googleapis.com/event-assets/gallery/hft_network_closet.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=hft_promo_2026",
    "capacity": {
      "totalSeats": 150,
      "reservedSeats": 20,
      "availableSeats": 130,
      "waitingListEnabled": true,
      "waitingListCapacity": 35,
      "maxRegistrationsPerUser": 2
    },
    "registration": {
      "registrationOpenDate": "2026-09-15",
      "registrationCloseDate": "2026-12-15",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "programming_language_focus",
          "label": "Primary Systems Programming Stack",
          "type": "dropdown",
          "options": ["C++ (Modern 17/20)", "Rust", "C / Assembly Core", "Go / Java High Performance"],
          "required": true,
          "helpText": "Crucial indicator to ensure cohort allocations match baseline system programming paradigms"
        }
      ],
      "earlyBirdDeadline": "2026-10-30",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Quant Systems Engineer Registration",
          "price": 22000,
          "availableUntil": "2026-12-15",
          "seats": 130,
          "description": "Full access to deep-tech systems presentations, performance sandbox allocations, and network profiling files."
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 50,
        "requiresVerification": true
      },
      "groupDiscount": {
        "enabled": true,
        "minGroupSize": 3,
        "percentage": 10
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_HFT01",
        "name": "Zubair Shahidi",
        "designation": "Director of Systems Performance Engineering",
        "bio": "Zubair codes ultra-low latency exchange matching engines, maintaining 16 years of kernel network tuning operational histories.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zubair_shahidi.jpg",
        "sessionTitle": "Keynote: Bypassing the Kernel: Ultra-Low Latency Network Architecture Design Patterns",
        "email": "z.shahidi@quant-infra.net",
        "linkedin": "https://linkedin.com/in/zubair-shahidi-quant",
        "twitter": "https://twitter.com/zubair_hft",
        "website": "https://quant-infra.net",
        "company": "QuantInfra Systems Group",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/quantinfra.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_HFT01", "SESS_HFT04"]
      },
      {
        "speakerId": "SPK_HFT02",
        "name": "Marcus Vance",
        "designation": "Principal Hardware Acceleration Engineer",
        "bio": "Marcus programs tailored FPGA execution cards executing complex options valuation pricing functions within nanosecond execution steps.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/marcus_vance.jpg",
        "sessionTitle": "Programming Dedicated Hardware Arrays for Nanosecond Options Evaluation Functions",
        "email": "m.vance@fpga-tech.org",
        "linkedin": "https://linkedin.com/in/marcus-vance-fpga",
        "twitter": "https://twitter.com/marcus_fpga",
        "website": "https://fpga-tech.org",
        "company": "FPGATech International Laboratories",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/fpgatech.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_HFT02", "SESS_HFT04"]
      },
      {
        "speakerId": "SPK_HFT03",
        "name": "Fiza Rafiq",
        "designation": "Lead Algorithmic Strategy Analyst",
        "bio": "Fiza constructs dynamic order book processing logic layers modeling multi-market order flow imbalances under high simulated stress vectors.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/fiza_rafiq.jpg",
        "sessionTitle": "Modeling Order Book Imbalance Vectors under Extreme Market Volatility Anomaly Conditions",
        "email": "fiza@arbitrage-foundry.com",
        "linkedin": "https://linkedin.com/in/fiza-rafiq-quant",
        "twitter": "https://twitter.com/fiza_quants",
        "website": "https://arbitrage-foundry.com",
        "company": "Arbitrage Foundry Group",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/arbitrage.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_HFT03"]
      },
      {
        "speakerId": "SPK_HFT04",
        "name": "Hamza Yusufi",
        "designation": "Risk Engine Infrastructure Supervisor",
        "bio": "Hamza builds autonomous sub-millisecond hardware-level circuit breaker safety gates protecting large corporate balance allocations.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/hamza_yusufi.jpg",
        "sessionTitle": "Engineering Hardware-Level Circuit Breakers to Neutralize Execution Tail Risk Trends",
        "email": "hamza@riskmesh.co",
        "linkedin": "https://linkedin.com/in/hamza-yusufi-risk",
        "twitter": "https://twitter.com/hamza_risk",
        "website": "https://riskmesh.co",
        "company": "RiskMesh Asset Protections",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/riskmesh.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_HFT04", "SESS_HFT05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_HFT01",
        "title": "Keynote: Bypassing the Kernel: Ultra-Low Latency Network Architecture Design Patterns",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-12-18",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Executive Suite Main Hall",
        "room": "Zone A",
        "building": "Movenpick Complex",
        "floor": "Ground Floor",
        "capacity": 150,
        "speakerNames": ["Zubair Shahidi"],
        "description": "A deep analysis detailing Solarflare OpenOnload network stacks manipulations alongside custom rings buffers optimization tactics to intercept packet flows without context switching overheads.",
        "activities": [
          { "time": "09:30-10:00", "description": "Measuring standard linux network layer pipeline processing time overhead bottlenecks", "type": "presentation" },
          { "time": "10:00-10:45", "description": "Structuring customized zero-copy ring buffers using lockless memory configuration architectures", "type": "presentation" },
          { "time": "10:45-11:00", "description": "Open expert floor review tracking memory ordering anomalies across concurrent cores", "type": "discussion" }
        ],
        "notes": "Strictly no media recording arrays allowed within the session boundaries.",
        "recordingUrl": "",
        "feedbackFormUrl": "https://forms.google.com/hft-sess-001",
        "isRecordingAvailable": false,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 142,
        "customFields": {}
      },
      {
        "sessionId": "SESS_HFT02",
        "title": "Programming Dedicated Hardware Arrays for Nanosecond Options Evaluation Functions",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-18",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Systems Diagnostics Room",
        "room": "Tech Suite 2",
        "building": "Movenpick Complex",
        "floor": "1st Floor",
        "capacity": 80,
        "speakerNames": ["Marcus Vance"],
        "description": "How to structure customized pipeline logic modules using SystemVerilog to compile automated Black-Scholes mathematical calculators straight into raw transistor grid networks.",
        "activities": [
          { "time": "11:30-12:15", "description": "Formulating high throughput fixed-point math approximations optimized for silicon execution paths", "type": "presentation" },
          { "time": "12:15-13:00", "description": "Reviewing timing alignment reports and testing gate trace delay modifications live", "type": "presentation" }
        ],
        "notes": "Meant explicitly for systems hardware layout designers and digital synthesis engineers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HFT02.mp4",
        "feedbackFormUrl": "https://forms.google.com/hft-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 80,
        "currentAttendees": 72,
        "customFields": {
          "githubRepo": "https://github.com/fpgatech-labs/verilog-options-pricer"
        }
      },
      {
        "sessionId": "SESS_HFT03",
        "title": "Modeling Order Book Imbalance Vectors under Extreme Market Volatility Anomaly Conditions",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-12-18",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Quantitative Analytics Laboratory",
        "room": "Lab Suite 1",
        "building": "Movenpick Annex",
        "floor": "2nd Floor",
        "capacity": 60,
        "speakerNames": ["Fiza Rafiq"],
        "description": "Practical simulation setup processing high frequency tick files to isolate queue depletion markers before wide spreading liquidity adjustments happen across exchanges.",
        "activities": [
          { "time": "14:30-15:00", "description": "Structuring fast state tracking trees processing market depth changes within streaming engines", "type": "presentation" },
          { "time": "15:00-15:45", "description": "Writing logic functions optimizing limit order placement strategies against depth drops", "type": "workshop", "requirements": ["Modern C++ compiler stack active", "Cloned trade history files ready"] },
          { "time": "15:45-16:00", "description": "Evaluating execution fills percentages against simulated queue place variations", "type": "workshop" }
        ],
        "notes": "High performance local compilation capabilities are required on candidate hardware layouts.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HFT03.mp4",
        "feedbackFormUrl": "https://forms.google.com/hft-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 60,
        "currentAttendees": 59,
        "customFields": {
          "githubRepo": "https://github.com/arbitrage-foundry/orderbook-imbalance-cpp"
        }
      },
      {
        "sessionId": "SESS_HFT04",
        "title": "Panel: Risk vs Execution Latency: Navigating the Tradeoffs cleanly",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-12-19",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Executive Suite Main Hall",
        "room": "Zone A",
        "building": "Movenpick Complex",
        "floor": "Ground Floor",
        "capacity": 150,
        "speakerNames": ["Zubair Shahidi", "Marcus Vance", "Hamza Yusufi"],
        "description": "Managing system configuration boundaries when multi-layered regulatory validation rules threaten to add performance penalties into competitive transaction pipelines.",
        "activities": [
          { "time": "10:00-10:55", "description": "Debating pre-trade telemetry checking mechanisms vs post-trade mitigation network filters", "type": "discussion" },
          { "time": "10:55-11:30", "description": "Audience floor case reviews detailing catastrophic un-monitored loop failures", "type": "discussion" }
        ],
        "notes": "Open to all core engineering badge tiers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HFT04.mp4",
        "feedbackFormUrl": "https://forms.google.com/hft-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 150,
        "currentAttendees": 130,
        "customFields": {}
      },
      {
        "sessionId": "SESS_HFT05",
        "title": "Engineering Hardware-Level Circuit Breakers to Neutralize Execution Tail Risk Trends",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-19",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Systems Diagnostics Room",
        "room": "Tech Suite 2",
        "building": "Movenpick Complex",
        "floor": "1st Floor",
        "capacity": 80,
        "speakerNames": ["Hamza Yusufi"],
        "description": "Constructing robust hardware level monitoring loops inside out-of-band network taps to instantly cut physical line connections when anomalous trade frequencies trigger.",
        "activities": [
          { "time": "13:30-14:15", "description": "Formulating threshold signature monitoring models over streaming network optical packet lines", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Reviewing architectural failure safe topologies and sub-microsecond electronic switch trip delays", "type": "presentation" }
        ],
        "notes": "Essential overview for institutional risk officers and compliance platform leads.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HFT05.mp4",
        "feedbackFormUrl": "https://forms.google.com/hft-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 80,
        "currentAttendees": 68,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_HFT01",
        "serviceCategory": "audiovisual",
        "description": "Dual high lumen crisp projection systems paired with closed circuit digital recording hardware suites.",
        "budget": 240000,
        "status": "assigned",
        "assignedVendorId": "VND_AV_009",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-09-20T10:00:00Z",
        "assignedAt": "2026-10-15T14:00:00Z",
        "completedAt": null,
        "notes": "Requires clean video feeds routing for local recording captures storage."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-07T14:00:00Z",
    "updatedAt": "2026-10-15T14:00:00Z",
    "publishedAt": "2026-10-18T09:00:00Z",
    "eventStartTime": "2026-12-18T04:00:00Z",
    "eventEndTime": "2026-12-19T13:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_8r9s0t1u2v3w4x5y6z7a",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Decentralized Data Mesh Platforms & Stream Engineering Masterclass",
    "description": "An intensive technical training framework centered entirely on domain-driven big data platforms. The program breaks apart old central database design models, shifting tracking metrics straight into highly scalable distributed domain nodes using automated event pipelines.",
    "shortDescription": "Implementing enterprise data mesh paradigms, stream processing pipelines, and unified metadata lineage tracking systems.",
    "category": "technology",
    "eventType": "training",
    "format": "virtual",
    "language": "en",
    "schedule": {
      "startDate": "2026-12-10",
      "endDate": "2026-12-11",
      "startTime": "10:00",
      "endTime": "16:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Data Engineering Portal Hub",
      "address": "Online Learning Engine Nodes",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5204,
        "longitude": 74.3587
      },
      "meetingPlatform": "Google Meet",
      "meetingLink": "https://meet.google.com/datamesh-masterclass-2026",
      "meetingId": "datamesh-masterclass-2026",
      "meetingPassword": "decentralize_your_data",
      "parkingInfo": "Not applicable due to virtual cloud pipeline delivery format choices.",
      "accessibilityInfo": "Integrated high visibility visual themes paired alongside real time closed description output channels.",
      "nearbyHotels": [],
      "nearbyRestaurants": []
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/datamesh_2026_main.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/mesh_ui.jpg",
      "https://storage.googleapis.com/event-assets/gallery/mesh_topology.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=mesh_promo_2026",
    "capacity": {
      "totalSeats": 250,
      "reservedSeats": 30,
      "availableSeats": 220,
      "waitingListEnabled": true,
      "waitingListCapacity": 50,
      "maxRegistrationsPerUser": 3
    },
    "registration": {
      "registrationOpenDate": "2026-09-10",
      "registrationCloseDate": "2026-12-08",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "data_stack_comfort",
          "label": "Primary Distributed Data Stack Experience",
          "type": "dropdown",
          "options": ["Apache Spark / Flink Core", "Standard SQL Data Warehousing", "NoSQL Clusters Manager", "Cloud Native Lakehouse Patterns"],
          "required": true,
          "helpText": "Aids assignment tracking during peer architecture review blocks"
        }
      ],
      "earlyBirdDeadline": "2026-10-25",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Professional Engineer Access Token",
          "price": 6500,
          "availableUntil": "2026-12-08",
          "seats": 200,
          "description": "Covers absolute access to cloud infrastructure deployment sandboxes and certified attendance tracking logs."
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
        "percentage": 15
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_DSH01",
        "name": "Mirza Bilal",
        "designation": "Director of Enterprise Data Platforms",
        "bio": "Mirza structures decentralized domain analytics layers for complex corporate matrices, replacing massive problematic central lakes.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/mirza_bilal.jpg",
        "sessionTitle": "Keynote: Transitioning Massive Enterprise Architectures into Clean Domain-Driven Mesh Paradigms",
        "email": "mbilal@datamesh-foundry.com",
        "linkedin": "https://linkedin.com/in/mirza-bilal-data",
        "twitter": "https://twitter.com/bilal_data",
        "website": "https://datamesh-foundry.com",
        "company": "DataMesh Foundry Group",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/datamesh_foundry.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_DSH01", "SESS_DSH04"]
      },
      {
        "speakerId": "SPK_DSH02",
        "name": "Raymond Vance",
        "designation": "Principal Real-Time Systems Architect",
        "bio": "Raymond codes scalable log consumer fabrics optimized to compute analytical summaries mid-transit across high data volume message brokers.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/raymond_vance.jpg",
        "sessionTitle": "Orchestrating Continuous Processing Streams over Distributed Message Fabrics",
        "email": "r.vance@stream-labs.net",
        "linkedin": "https://linkedin.com/in/raymond-vance-stream",
        "twitter": "https://twitter.com/ray_stream_ops",
        "website": "https://stream-labs.net",
        "company": "StreamLabs Solutions Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/streamlabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_DSH02", "SESS_DSH04"]
      },
      {
        "speakerId": "SPK_DSH03",
        "name": "Zainab Chaniyo",
        "designation": "Lead Metadata Governance Engineer",
        "bio": "Zainab builds dynamic automated data mapping catalogs tracing exact dependency paths from source mutations down to report views.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zainab_chaniyo.jpg",
        "sessionTitle": "Automating Real-Time Data Lineage Mapping within Decentralized Topologies",
        "email": "zainab@catalog-mesh.io",
        "linkedin": "https://linkedin.com/in/zainab-chaniyo-data",
        "twitter": "https://twitter.com/zainab_catalog",
        "website": "https://catalog-mesh.io",
        "company": "CatalogMesh Analytics",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/catalogmesh.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_DSH03"]
      },
      {
        "speakerId": "SPK_DSH04",
        "name": "Asad Farooqui",
        "designation": "Analytical Infrastructure Supervisor",
        "bio": "Asad oversees secure deployment structures protecting analytics computing engines from cross-tenant privilege escalation threats.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/asad_farooqui.jpg",
        "sessionTitle": "Enforcing Context-Aware Access Isolation Rules across Analytical Data Products",
        "email": "asad.farooqui@securedata.org",
        "linkedin": "https://linkedin.com/in/asad-farooqui-secure",
        "twitter": "https://twitter.com/asad_data_sec",
        "website": "https://securedata.org",
        "company": "SecureData Foundations",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/securedata.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_DSH04", "SESS_DSH05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_DSH01",
        "title": "Keynote: Transitioning Massive Enterprise Architectures into Clean Domain-Driven Mesh Paradigms",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-12-10",
        "startTime": "10:30",
        "endTime": "12:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Masterclass Main Node",
        "room": "Stream Portal Alpha",
        "building": "Cloud Infrastructure Network",
        "floor": "Not Applicable",
        "capacity": 250,
        "speakerNames": ["Mirza Bilal"],
        "description": "Formulating structural governance patterns and team alignment benchmarks to break down massive unmanaged corporate storage blocks into clear product modules.",
        "activities": [
          { "time": "10:30-11:00", "description": "Deconstructing cross-domain dependency traps inside linear datalake designs", "type": "presentation" },
          { "time": "11:00-11:45", "description": "Defining automated contract schemas bounding isolated domain output tables cleanly", "type": "presentation" },
          { "time": "11:45-12:00", "description": "Open chat consultation responding to live user-submitted architectural blocker summaries", "type": "discussion" }
        ],
        "notes": "Workbook diagrams will package into downloadable file shares post-session.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_DSH01.mp4",
        "feedbackFormUrl": "https://forms.google.com/dsh-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 250,
        "currentAttendees": 215,
        "customFields": {}
      },
      {
        "sessionId": "SESS_DSH02",
        "title": "Orchestrating Continuous Processing Streams over Distributed Message Fabrics",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-10",
        "startTime": "13:00",
        "endTime": "14:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Masterclass Technical Hub",
        "room": "Stream Portal Beta",
        "building": "Cloud Infrastructure Network",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Raymond Vance"],
        "description": "How to write fault-tolerant state aggregation scripts inside stream engines to compute transactional patterns without memory overflow risks.",
        "activities": [
          { "time": "13:00-13:45", "description": "Configuring event temporal window settings over un-ordered distributed event inputs", "type": "presentation" },
          { "time": "13:45-14:30", "description": "Evaluating execution checkpoints patterns to guarantee absolute exactly-once data processing updates", "type": "presentation" }
        ],
        "notes": "Strongly recommended for senior data platform builders and telemetry systems leads.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_DSH02.mp4",
        "feedbackFormUrl": "https://forms.google.com/dsh-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 134,
        "customFields": {
          "githubRepo": "https://github.com/streamlabs-global/exactly-once-flink-pipeline"
        }
      },
      {
        "sessionId": "SESS_DSH03",
        "title": "Automating Real-Time Data Lineage Mapping within Decentralized Topologies",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-12-10",
        "startTime": "14:45",
        "endTime": "16:00",
        "duration": "75 minutes",
        "timezone": "PKT",
        "location": "Virtual Masterclass Coding Sandbox",
        "room": "Stream Portal Gamma",
        "building": "Cloud Infrastructure Network",
        "floor": "Not Applicable",
        "capacity": 100,
        "speakerNames": ["Zainab Chaniyo"],
        "description": "Hands-on implementation building runtime parsing filters that dynamically read catalog updates and construct live visual link representations.",
        "activities": [
          { "time": "14:45-15:15", "description": "Extracting structural parsing metrics from cloud deployment metadata registries", "type": "presentation" },
          { "time": "15:15-16:00", "description": "Deploying open line metadata collectors and executing tracking tests live", "type": "workshop", "requirements": ["Docker ready console", "Python environment setup active"] }
        ],
        "notes": "Verify pre-provisioned sandbox cloud account passwords prior to the module start sequence.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_DSH03.mp4",
        "feedbackFormUrl": "https://forms.google.com/dsh-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 92,
        "customFields": {
          "githubRepo": "https://github.com/catalogmesh-io/automated-lineage-parser"
        }
      },
      {
        "sessionId": "SESS_DSH04",
        "title": "Panel: Overcoming Centralized Thinking Barriers in Corporate Leadership Teams",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-12-11",
        "startTime": "11:00",
        "endTime": "12:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Masterclass Main Node",
        "room": "Stream Portal Alpha",
        "building": "Cloud Infrastructure Network",
        "floor": "Not Applicable",
        "capacity": 250,
        "speakerNames": ["Mirza Bilal", "Raymond Vance", "Asad Farooqui"],
        "description": "Aligning data engineering cost structures, setting isolated budget limits, and managing dynamic cross-domain compliance validation mandates safely.",
        "activities": [
          { "time": "11:00-11:55", "description": "Debating cross-domain internal pricing models and resource accounting logic layers", "type": "discussion" },
          { "time": "11:55-12:30", "description": "Open chat feed strategy review evaluating practical structural corporate friction points", "type": "discussion" }
        ],
        "notes": "Open to all verified training delegate tiers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_DSH04.mp4",
        "feedbackFormUrl": "https://forms.google.com/dsh-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 250,
        "currentAttendees": 198,
        "customFields": {}
      },
      {
        "sessionId": "SESS_DSH05",
        "title": "Enforcing Context-Aware Access Isolation Rules across Analytical Data Products",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-11",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Masterclass Technical Hub",
        "room": "Stream Portal Beta",
        "building": "Cloud Infrastructure Network",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Asad Farooqui"],
        "description": "Constructing robust automated policy validation systems that check incoming user scopes down to specific table rows before releasing analytical arrays.",
        "activities": [
          { "time": "13:30-14:15", "description": "Mapping real-time column masking rules over mixed classification database views", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Reviewing scalable role management structures across federated storage environments", "type": "presentation" }
        ],
        "notes": "Essential course block for cloud security engineers and analytical compliance operations paths.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_DSH05.mp4",
        "feedbackFormUrl": "https://forms.google.com/dsh-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 110,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_DSH01",
        "serviceCategory": "custom",
        "description": "Managed cloud live stream processing engine allocation to support smooth 250 endpoint multimedia distributions.",
        "budget": 60000,
        "status": "assigned",
        "assignedVendorId": "VND_CLD_711",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-09-15T11:00:00Z",
        "assignedAt": "2026-10-02T10:00:00Z",
        "completedAt": null,
        "notes": "Requires end to end transport layer encryption enabled across all streaming control loops."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-08T11:00:00Z",
    "updatedAt": "2026-10-02T10:00:00Z",
    "publishedAt": "2026-10-05T09:00:00Z",
    "eventStartTime": "2026-12-10T05:00:00Z",
    "eventEndTime": "2026-12-11T11:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_9s0t1u2v3w4x5y6z7a8b",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "International Sports Science & Athletic Performance Symposium 2026",
    "description": "A cutting-edge physical convention gathering biomechanical researchers, team medical supervisors, and high performance athletic trainers. Key tracks investigate algorithmic movement tracking tools, personalized localized exhaustion profiling formulas, modern physical injury recovery frameworks, and telemetry sensor array configurations.",
    "shortDescription": "Deconstructing advanced kinetic mechanics, real-time workload exhaustion tracking, and empirical tissue repair paradigms.",
    "category": "sports",
    "eventType": "seminar",
    "format": "physical",
    "language": "en",
    "schedule": {
      "startDate": "2026-11-08",
      "endDate": "2026-11-09",
      "startTime": "08:30",
      "endTime": "17:30",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "National High Performance Center Hall",
      "address": "Ferozepur Road, Near Gaddafi Stadium",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5142,
        "longitude": 74.3328
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://symposium.nhpc.gov.pk",
      "meetingId": "SPORTS2026",
      "meetingPassword": "kinetic_performance",
      "parkingInfo": "Spacious open-air visitor parking infrastructure available explicitly via Stadium Main Loop Gate A.",
      "accessibilityInfo": "Equipped with wide step-free ground floor access portals, dedicated mobility paths, and modified elevator units.",
      "nearbyHotels": [
        "The Nishat Hotel Johar Town",
        "Park Lane Hotel Lahore",
        "Grand Enclave"
      ],
      "nearbyRestaurants": [
        "Monolith Cafe Stadium",
        "Gourmet Restaurant",
        "Bashir Darul Mahi"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/sports_science_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/sports_hall.jpg",
      "https://storage.googleapis.com/event-assets/gallery/sports_lab_demo.jpg",
      "https://storage.googleapis.com/event-assets/gallery/sports_tracking.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=sports_promo_2026",
    "capacity": {
      "totalSeats": 250,
      "reservedSeats": 40,
      "availableSeats": 210,
      "waitingListEnabled": true,
      "waitingListCapacity": 40,
      "maxRegistrationsPerUser": 2
    },
    "registration": {
      "registrationOpenDate": "2026-08-10",
      "registrationCloseDate": "2026-11-05",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "athletic_credential",
          "label": "Professional Affiliation Sector",
          "type": "dropdown",
          "options": ["National/Provincial Sports Board", "Clinical Physiotherapist", "Biomechanical Academic Researcher", "Private Fitness Consultant", "Student Observer"],
          "required": true,
          "helpText": "Aids layout customization across strategic evening physical networking circles"
        }
      ],
      "earlyBirdDeadline": "2026-09-25",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "Professional Delegate General Pass",
          "price": 5000,
          "availableUntil": "2026-11-05",
          "seats": 180,
          "description": "Covers entry token across all presentation arenas, practical testing fields, and daily catered lunches."
        }
      ],
      "studentDiscount": {
        "enabled": true,
        "percentage": 50,
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
        "speakerId": "SPK_SPT01",
        "name": "Dr. Kamran Baig",
        "designation": "Director of Biomechanical Modeling Labs",
        "bio": "Dr. Kamran models skeletal stress profiles using high frequency spatial tracking systems, serving as advisor to multiple national physical training bodies.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/kamran_baig.jpg",
        "sessionTitle": "Keynote: Formulating High Frequency Kinetic Models to Isolate Joint Failure Risks",
        "email": "kamran.baig@nhpc.gov.pk",
        "linkedin": "https://linkedin.com/in/kamran-baig-biomechanics",
        "twitter": "https://twitter.com/k_baig_sports",
        "website": "https://nhpc.gov.pk",
        "company": "National High Performance Center",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/nhpc_logo.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_SPT01", "SESS_SPT04"]
      },
      {
        "speakerId": "SPK_SPT02",
        "name": "Dr. Marcus Thorne",
        "designation": "Principal Workload Exhaustion Analyst",
        "bio": "Dr. Thorne builds predictive performance metrics parsing continuous heart rate variability tracking logs from wearable tracking bands.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/marcus_thorne.jpg",
        "sessionTitle": "Analyzing Continuous Heart Variability Distributions to Prevent Over-Training Strains",
        "email": "m.thorne@performance-labs.uk",
        "linkedin": "https://linkedin.com/in/marcus-thorne-performance",
        "twitter": "https://twitter.com/thorne_performance",
        "website": "https://performance-labs.uk",
        "company": "PerformanceLabs United Kingdom",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/performancelabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_SPT02", "SESS_SPT04"]
      },
      {
        "speakerId": "SPK_SPT03",
        "name": "Zainab Raza",
        "designation": "Lead Clinical Physiotherapist",
        "bio": "Zainab orchestrates accelerated structural tissue repair protocols combining high density focal tracking metrics with local cellular recovery matrices.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zainab_raza.jpg",
        "sessionTitle": "Accelerated Tendon Tissue Repair Frameworks: Empirical Validation Models",
        "email": "zainab.raza@sportsrehab.pk",
        "linkedin": "https://linkedin.com/in/zainab-raza-rehab",
        "twitter": "https://twitter.com/zainab_rehab",
        "website": "https://sportsrehab.pk",
        "company": "National Sports Rehabilitation Clinic",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/sportsrehab.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_SPT03"]
      },
      {
        "speakerId": "SPK_SPT04",
        "name": "Asif Afridi",
        "designation": "Athletic Telemetry Infrastructure Lead",
        "bio": "Asif codes low latency data collection pipelines processing multi-node spatial sensor acceleration readings across dynamic fields.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/asif_afridi.jpg",
        "sessionTitle": "Deploying Low Latency Inertial Telemetry Arrays across Active Competitive Training Fields",
        "email": "asif@telemetry-sports.io",
        "linkedin": "https://linkedin.com/in/asif-afridi-telemetry",
        "twitter": "https://twitter.com/asif_sensor_ai",
        "website": "https://telemetry-sports.io",
        "company": "TelemetrySports Systems",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/telemetrysports.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_SPT04", "SESS_SPT05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_SPT01",
        "title": "Keynote: Formulating High Frequency Kinetic Models to Isolate Joint Failure Risks",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-11-08",
        "startTime": "09:30",
        "endTime": "11:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NHPC Main Presentation Arena",
        "room": "Hall A",
        "building": "Center Excellence Complex",
        "floor": "Ground Floor",
        "capacity": 250,
        "speakerNames": ["Dr. Kamran Baig"],
        "description": "An analytical biomechanical breakdown detailing how multi-camera spatial data tracking arrays compute localized joint micro-stress markers during ballistic velocity outputs.",
        "activities": [
          { "time": "09:30-10:00", "description": "Reviewing structural load distribution errors during high exhaustion states", "type": "presentation" },
          { "time": "10:00-10:45", "description": "Formulating vector torque calculation parameters across dynamic skeletal models", "type": "presentation" },
          { "time": "10:45-11:00", "description": "Interactive case diagnostic open review with delegate floor paths", "type": "discussion" }
        ],
        "notes": "Session presentation recording records will upload onto delegate dashboard profiles.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SPT01.mp4",
        "feedbackFormUrl": "https://forms.google.com/spt-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 250,
        "currentAttendees": 204,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SPT02",
        "title": "Analyzing Continuous Heart Variability Distributions to Prevent Over-Training Strains",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-08",
        "startTime": "11:30",
        "endTime": "13:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NHPC Seminar Suite",
        "room": "Room 201",
        "building": "Center Excellence Complex",
        "floor": "1st Floor",
        "capacity": 100,
        "speakerNames": ["Dr. Marcus Thorne"],
        "description": "How to isolate sympathetic from parasympathetic nervous system fatigue traces by compiling autonomous frequency metrics tracking autonomic status alterations.",
        "activities": [
          { "time": "11:30-12:20", "description": "Formulating mathematical time domain tracking variations indicators from sensor arrays", "type": "presentation" },
          { "time": "12:20-13:00", "description": "Reviewing empirical field tracking data showing stress recovery curves profiles", "type": "presentation" }
        ],
        "notes": "Intended primarily for elite sports medicine practitioners and athletic tracking analysts.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SPT02.mp4",
        "feedbackFormUrl": "https://forms.google.com/spt-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 91,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SPT03",
        "title": "Accelerated Tendon Tissue Repair Frameworks: Empirical Validation Models",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-11-08",
        "startTime": "14:30",
        "endTime": "16:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Practical Testing Field Hall",
        "room": "Biomechanical Lab A",
        "building": "Athletic Training Annex",
        "floor": "Ground Floor",
        "capacity": 60,
        "speakerNames": ["Zainab Raza"],
        "description": "Practical setup demonstrating real-time loading evaluation matrices designed to stimulate structural matrix organization paths during tissue healing timelines.",
        "activities": [
          { "time": "14:30-15:00", "description": "Reviewing biological limits governing modern structural mechanical loading exercises", "type": "presentation" },
          { "time": "15:00-15:45", "description": "Live tracking adjustments over synthetic pressure sensor array dashboards configurations", "type": "workshop", "requirements": ["Pre-installed telemetry viewing app active on mobile nodes"] },
          { "time": "15:45-16:00", "description": "Analyzing structural tensor strain drop factors under varying extension velocities", "type": "workshop" }
        ],
        "notes": "Bring comfortable active footwear options for the lab test space boundaries.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SPT03.mp4",
        "feedbackFormUrl": "https://forms.google.com/spt-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 60,
        "currentAttendees": 57,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SPT04",
        "title": "Panel: Interlinking Biomedical Metrics with Live High-Performance Team Realities",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-11-09",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NHPC Main Presentation Arena",
        "room": "Hall A",
        "building": "Center Excellence Complex",
        "floor": "Ground Floor",
        "capacity": 250,
        "speakerNames": ["Dr. Kamran Baig", "Dr. Marcus Thorne", "Asif Afridi"],
        "description": "Managing training scheduling constraints, setting safe optimization parameters, and overcoming data translation hurdles between medical and coaching divisions.",
        "activities": [
          { "time": "10:00-10:50", "description": "Debating performance management boundaries versus athlete healthcare confidentiality protocols", "type": "discussion" },
          { "time": "10:50-11:30", "description": "Open floor delegate questionnaire review detailing tracking system compliance issues", "type": "discussion" }
        ],
        "notes": "Open delegate forum access applies.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SPT04.mp4",
        "feedbackFormUrl": "https://forms.google.com/spt-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 250,
        "currentAttendees": 210,
        "customFields": {}
      },
      {
        "sessionId": "SESS_SPT05",
        "title": "Deploying Low Latency Inertial Telemetry Arrays across Active Competitive Training Fields",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-09",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "NHPC Seminar Suite",
        "room": "Room 201",
        "building": "Center Excellence Complex",
        "floor": "1st Floor",
        "capacity": 100,
        "speakerNames": ["Asif Afridi"],
        "description": "Constructing robust local network hubs configured to ingest dynamic sensor readouts across active radio frequency interference channels seamlessly.",
        "activities": [
          { "time": "13:30-14:15", "description": "Mapping mesh communication paths optimized to eliminate localized network dropout zones", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Measuring continuous spatial location vector calibration performance indicators", "type": "presentation" }
        ],
        "notes": "Highly relevant for technological coordinators and athletic sensor platform developers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_SPT05.mp4",
        "feedbackFormUrl": "https://forms.google.com/spt-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 100,
        "currentAttendees": 79,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_SPT01",
        "serviceCategory": "catering",
        "description": "High nutrition premium corporate lunch buffets setup for two consecutive conference presentation days.",
        "budget": 380000,
        "status": "assigned",
        "assignedVendorId": "VND_CAT_411",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-15T10:00:00Z",
        "assignedAt": "2026-09-05T12:00:00Z",
        "completedAt": null,
        "notes": "Must deliver detailed macroscopic metrics labels alongside each serving array segment."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-09T10:00:00Z",
    "updatedAt": "2026-09-05T12:00:00Z",
    "publishedAt": "2026-09-10T08:00:00Z",
    "eventStartTime": "2026-11-08T03:30:00Z",
    "eventEndTime": "2026-11-09T12:30:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_0u1v2w3x4y5z6a7b8c9d",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Contemporary Curatorial Practices & Art History Biennale Forum",
    "description": "An avant-garde physical seminar examining structural adjustments within international exhibition frameworks. Focus points cover digital space virtualization strategies, decentralized artist compensation network patterns, sustainable historical material preservation tactics, and multi-institutional interactive displays orchestration.",
    "shortDescription": "Deconstructing museum spaces, public aesthetic theory patterns, and dynamic digital installation configurations.",
    "category": "arts",
    "eventType": "seminar",
    "format": "physical",
    "language": "en",
    "schedule": {
      "startDate": "2026-11-14",
      "endDate": "2026-11-15",
      "startTime": "10:00",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Alhamra Arts Council Hall 2",
      "address": "Mall Road, Near Governor House",
      "city": "Lahore",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 31.5587,
        "longitude": 74.3312
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://arts-portal.alhamra.org",
      "meetingId": "ALHAMRA2026",
      "meetingPassword": "aesthetic_theory",
      "parkingInfo": "On-site open parking slots available for attendees via Main Entrance Gate.",
      "accessibilityInfo": "Ground level main stage portal access paths alongside manual mobility chair allocations verified.",
      "nearbyHotels": [
        "Pearl Continental Hotel Lahore",
        "Avari Hotel Lahore",
        "Luxus Grand Hotel"
      ],
      "nearbyRestaurants": [
        "Lord of the Food Mall Road",
        "Café Aylanto",
        "The Last Word Café"
      ]
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/arts_biennale_2026.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/arts_gallery_hall.jpg",
      "https://storage.googleapis.com/event-assets/gallery/arts_panel_stage.jpg",
      "https://storage.googleapis.com/event-assets/gallery/arts_display.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=arts_promo_2026",
    "capacity": {
      "totalSeats": 180,
      "reservedSeats": 30,
      "availableSeats": 150,
      "waitingListEnabled": true,
      "waitingListCapacity": 25,
      "maxRegistrationsPerUser": 3
    },
    "registration": {
      "registrationOpenDate": "2026-08-15",
      "registrationCloseDate": "2026-11-10",
      "requiresApproval": false,
      "customForm": [
        {
          "fieldId": "curatorial_domain",
          "label": "Primary Artistic Medium Interest Focus",
          "type": "dropdown",
          "options": ["Fine Arts & Painting", "Digital / Interactive Installations", "Museum Asset Archiving", "Aesthetic Theory Research", "Independent Curator / Critic"],
          "required": true,
          "helpText": "Aids layout mapping across strategic evening physical networking circles"
        }
      ],
      "earlyBirdDeadline": "2026-10-01",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": true
    },
    "pricing": {
      "isFree": false,
      "currency": "PKR",
      "tiers": [
        {
          "name": "General Delegate Registration Ticket",
          "price": 4000,
          "availableUntil": "2026-11-10",
          "seats": 120,
          "description": "Covers entrance token across all presentation spaces, art installation viewing tracks, and coffee layouts."
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
        "percentage": 10
      }
    },
    "speakers": [
      {
        "speakerId": "SPK_ART01",
        "name": "Dr. Amina El-Amin",
        "designation": "Professor of Curatorial Aesthetics",
        "bio": "Dr. Amina models public spatial interactive designs, advising global modern art institutions across historical collection virtualization layers.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/amina_elamin.jpg",
        "sessionTitle": "Keynote: Redefining the Museum Geometry Boundaries within Digital Spatial Formats",
        "email": "amina.elamin@alhamra.org",
        "linkedin": "https://linkedin.com/in/amina-el-amin-arts",
        "twitter": "https://twitter.com/amina_curates",
        "website": "https://alhamra.org",
        "company": "Alhamra Research Frameworks",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/alhamra_logo.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_ART01", "SESS_ART04"]
      },
      {
        "speakerId": "SPK_ART02",
        "name": "Claire Dupont",
        "designation": "Lead Interactive Spatial Designer",
        "bio": "Claire builds algorithmic projections layers capturing visitor proximity loops to dynamically alter physical environment lighting patterns.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/claire_dupont.jpg",
        "sessionTitle": "Deploying Dynamic Projection Framework Layers inside Public Interactive Installations",
        "email": "c.dupont@interactive-spaces.fr",
        "linkedin": "https://linkedin.com/in/claire-dupont-spatial",
        "twitter": "https://twitter.com/claire_spaces",
        "website": "https://interactive-spaces.fr",
        "company": "Interactive Spaces Studio Paris",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/interactivespaces.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_ART02", "SESS_ART04"]
      },
      {
        "speakerId": "SPK_ART03",
        "name": "Raza Ali Khan",
        "designation": "Director of Historical Preservation",
        "bio": "Raza coordinates chemical synthesis tracking protocols ensuring old organic paint pigments stay structurally stable across long timelines.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/raza_alikhan.jpg",
        "sessionTitle": "Preservation Chemistry: Protecting Organic Pigment Arrays from Ultraviolet Oxidation Profiles",
        "email": "raza.ali@preservation.gov.pk",
        "linkedin": "https://linkedin.com/in/raza-ali-preservation",
        "twitter": "https://twitter.com/raza_archives",
        "website": "https://preservation.gov.pk",
        "company": "National Heritage Preservation Council",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/nhpc_heritage.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_ART03"]
      },
      {
        "speakerId": "SPK_ART04",
        "name": "Zayd Mahmood",
        "designation": "Digital Media Independent Critic",
        "bio": "Zayd writes deep theoretical assessments tracking contemporary digital compensation models, evaluating decentralization platforms impacts.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zayd_mahmood_art.jpg",
        "sessionTitle": "Structuring Decentralized Royalty Distribution Networks: Autonomy for Creators",
        "email": "zayd@art-critique.io",
        "linkedin": "https://linkedin.com/in/zayd-mahmood-critic",
        "twitter": "https://twitter.com/zayd_critiques",
        "website": "https://art-critique.io",
        "company": "ArtCritique Modern",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/artcritique.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_ART04", "SESS_ART05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_ART01",
        "title": "Keynote: Redefining the Museum Geometry Boundaries within Digital Spatial Formats",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-11-14",
        "startTime": "10:30",
        "endTime": "12:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Alhamra Auditorium Hall 2",
        "room": "Main Floor",
        "building": "Arts Council Complex",
        "floor": "Ground Floor",
        "capacity": 180,
        "speakerNames": ["Dr. Amina El-Amin"],
        "description": "An aesthetic theory breakdown detailing how high-density spatial virtualization transforms public consumption habits, modifying collection accessibility parameters.",
        "activities": [
          { "time": "10:30-11:00", "description": "Reviewing public engagement degradation records within classic museum spatial formats", "type": "presentation" },
          { "time": "11:00-11:45", "description": "Modeling volumetric layout configurations across virtual museum engine platforms", "type": "presentation" },
          { "time": "11:45-12:00", "description": "Strategic delegate group discussion focusing on public museum funding tracking methods", "type": "discussion" }
        ],
        "notes": "Presentation slides packages will sync onto delegate digital profiles post event session.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_ART01.mp4",
        "feedbackFormUrl": "https://forms.google.com/art-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 180,
        "currentAttendees": 142,
        "customFields": {}
      },
      {
        "sessionId": "SESS_ART02",
        "title": "Deploying Dynamic Projection Framework Layers inside Public Interactive Installations",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-14",
        "startTime": "13:30",
        "endTime": "15:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Alhamra Exhibition Annex",
        "room": "Gallery Suite 1",
        "building": "Arts Council Complex",
        "floor": "1st Floor",
        "capacity": 90,
        "speakerNames": ["Claire Dupont"],
        "description": "How to calibrate real-time proximity tracking sensors to update immersive spatial media arrays without processing latency delays.",
        "activities": [
          { "time": "13:30-14:15", "description": "Formulating mapping calibration equations across irregular gallery wall matrices", "type": "presentation" },
          { "time": "14:15-15:00", "description": "Reviewing test validation reports showing participant engagement density shifts", "type": "presentation" }
        ],
        "notes": "Meant primarily for installation engineering specialists and contemporary spatial layout curators.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_ART02.mp4",
        "feedbackFormUrl": "https://forms.google.com/art-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 90,
        "currentAttendees": 85,
        "customFields": {}
      },
      {
        "sessionId": "SESS_ART03",
        "title": "Preservation Chemistry: Protecting Organic Pigment Arrays from Ultraviolet Oxidation Profiles",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-11-14",
        "startTime": "15:30",
        "endTime": "17:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Conservation Research Studio",
        "room": "Lab Room B",
        "building": "Heritage Protection Wing",
        "floor": "Basement",
        "capacity": 50,
        "speakerNames": ["Raza Ali Khan"],
        "description": "Practical session demonstrating micro-chemical analysis methods designed to evaluate protective structural acrylic coat layers across historical canvases.",
        "activities": [
          { "time": "15:30-16:00", "description": "Reviewing degradation metrics from long horizon ultraviolet exposure tests profiles", "type": "presentation" },
          { "time": "16:00-16:45", "description": "Testing micro-sample canvas responses under varied laser spectroscopy reading nodes", "type": "workshop", "requirements": ["Protective lab eyewear verified pre-session", "Cloned baseline data files ready"] },
          { "time": "16:45-17:00", "description": "Evaluating stability indexing formulas against chemical preservation cost indicators", "type": "workshop" }
        ],
        "notes": "Laboratory safety procedures apply strictly within physical studio walls borders.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_ART03.mp4",
        "feedbackFormUrl": "https://forms.google.com/art-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 50,
        "currentAttendees": 47,
        "customFields": {}
      },
      {
        "sessionId": "SESS_ART04",
        "title": "Panel: Ethical Realities inside High-Value Global Art Digitization Programs",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-11-15",
        "startTime": "11:00",
        "endTime": "12:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Alhamra Auditorium Hall 2",
        "room": "Main Floor",
        "building": "Arts Council Complex",
        "floor": "Ground Floor",
        "capacity": 180,
        "speakerNames": ["Dr. Amina El-Amin", "Claire Dupont", "Zayd Mahmood"],
        "description": "Balancing open community asset registration mandates, protecting commercial distribution bounds, and managing institutional ownership data trails.",
        "activities": [
          { "time": "11:00-11:50", "description": "Debating copyright sovereignty guidelines across federated digital museum replica clusters", "type": "discussion" },
          { "time": "11:50-12:30", "description": "Open floor dynamic delegate question tracking block processing", "type": "discussion" }
        ],
        "notes": "Open delegate forum access applies.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_ART04.mp4",
        "feedbackFormUrl": "https://forms.google.com/art-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 180,
        "currentAttendees": 139,
        "customFields": {}
      },
      {
        "sessionId": "SESS_ART05",
        "title": "Structuring Decentralized Royalty Distribution Networks: Autonomy for Creators",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-11-15",
        "startTime": "14:00",
        "endTime": "15:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Alhamra Exhibition Annex",
        "room": "Gallery Suite 1",
        "building": "Arts Council Complex",
        "floor": "1st Floor",
        "capacity": 90,
        "speakerNames": ["Zayd Mahmood"],
        "description": "Constructing secure distributed contract configurations configured to execute micro-payments automatically on asset interactions without intermediary processing commissions.",
        "activities": [
          { "time": "14:00-14:45", "description": "Mapping digital verification lineages over collaborative multi-author creative records", "type": "presentation" },
          { "time": "14:45-15:30", "description": "Measuring continuous execution pricing performance variations across protocol networks", "type": "presentation" }
        ],
        "notes": "Essential session block for cultural policy innovators and independent artist cooperative leads.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_ART05.mp4",
        "feedbackFormUrl": "https://forms.google.com/art-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 90,
        "currentAttendees": 68,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_ART01",
        "serviceCategory": "printing",
        "description": "High fidelity printing of art showcase catalog books and exhibition path maps for delegate welcoming packages.",
        "budget": 55000,
        "status": "assigned",
        "assignedVendorId": "VND_PRN_202",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-08-20T11:00:00Z",
        "assignedAt": "2026-09-12T15:00:00Z",
        "completedAt": null,
        "notes": "Requires fine paper weight selections to keep artwork representations color accurate."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-10T11:00:00Z",
    "updatedAt": "2026-09-12T15:00:00Z",
    "publishedAt": "2026-09-15T09:00:00Z",
    "eventStartTime": "2026-11-14T05:00:00Z",
    "eventEndTime": "2026-11-15T12:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },
  {
    "eventId": "EVT_1v2w3x4y5z6a7b8c9d0e",
    "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
    "title": "Distributed Ledger Architecture & Consensus Systems Hackathon 2026",
    "description": "An intensive competitive 48-hour virtual engineering hackathon event. Engineering teams will focus entirely on developing low-overhead validation node engines, scalable consensus protocol wrappers, context-aware smart contracts matrices, and cryptographic identity tracking pipelines under intense temporal constraints.",
    "shortDescription": "Compiling resilient validation frameworks, sub-second block commit optimizations, and zero-knowledge application systems.",
    "category": "technology",
    "eventType": "hackathon",
    "format": "virtual",
    "language": "en",
    "schedule": {
      "startDate": "2026-12-04",
      "endDate": "2026-12-06",
      "startTime": "17:00",
      "endTime": "17:00",
      "timezone": "PKT",
      "isRecurring": false,
      "recurrencePattern": null
    },
    "location": {
      "venueName": "Virtual Hackathon Engine Node",
      "address": "Online Competitive Server Mesh",
      "city": "Karachi",
      "country": "Pakistan",
      "coordinates": {
        "latitude": 24.8607,
        "longitude": 67.0011
      },
      "meetingPlatform": "Custom",
      "meetingLink": "https://hack.systems-scale.io",
      "meetingId": "HACK2026",
      "meetingPassword": "compile_the_consensus",
      "parkingInfo": "Not applicable due to remote virtual server compilation layout designs.",
      "accessibilityInfo": "Full digital interface contrast customization hooks paired alongside asynchronous text validation channels ready.",
      "nearbyHotels": [],
      "nearbyRestaurants": []
    },
    "bannerImage": "https://storage.googleapis.com/event-assets/banners/hackathon_2026_hero.jpg",
    "galleryImages": [
      "https://storage.googleapis.com/event-assets/gallery/hack_dashboard.jpg",
      "https://storage.googleapis.com/event-assets/gallery/hack_leaderboard.jpg"
    ],
    "promoVideoUrl": "https://youtube.com/watch?v=hack_promo_2026",
    "capacity": {
      "totalSeats": 300,
      "reservedSeats": 40,
      "availableSeats": 260,
      "waitingListEnabled": false,
      "waitingListCapacity": 0,
      "maxRegistrationsPerUser": 5
    },
    "registration": {
      "registrationOpenDate": "2026-09-01",
      "registrationCloseDate": "2026-12-01",
      "requiresApproval": true,
      "customForm": [
        {
          "fieldId": "git_profile",
          "label": "Public Code Repository Profile Link (GitHub/GitLab)",
          "type": "text",
          "options": [],
          "required": true,
          "helpText": "Crucial tool utilized by vetting panels to measure baseline programming system experiences before approval"
        }
      ],
      "earlyBirdDeadline": "2026-10-15",
      "groupRegistrationEnabled": true,
      "groupDiscountEnabled": false
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
        "speakerId": "SPK_HCK01",
        "name": "Dr. Zainab Mahmood",
        "designation": "Principal Distributed Systems Architect",
        "bio": "Dr. Zainab designs global consensus engine systems, spending 15 years developing ultra-resilient cluster data fabrics under heavy transaction vectors.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zainab_mahmood.jpg",
        "sessionTitle": "Keynote Opening: Structural Attack Vectors Targeting Ephemeral Consensus Topologies",
        "email": "zainab.mahmood@systems-scale.io",
        "linkedin": "https://linkedin.com/in/zainab-mahmood-dist-sys",
        "twitter": "https://twitter.com/zainab_codes",
        "website": "https://systems-scale.io",
        "company": "Scale Dynamics Corp",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/scale_dynamics.png",
        "isKeynote": true,
        "isPanelist": true,
        "order": 1,
        "sessions": ["SESS_HCK01", "SESS_HCK04"]
      },
      {
        "speakerId": "SPK_HCK02",
        "name": "Zohair Khawaja",
        "designation": "Lead Ledger Architect",
        "bio": "Zohair scale deploys specialized permissioned ledger matrices optimizing transactional block generation scripts for international remittance pipelines.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/zohair_khawaja.jpg",
        "sessionTitle": "Optimizing Block Serialization Latency Parameters inside Custom Node Engines",
        "email": "zohair@ledgerworks.io",
        "linkedin": "https://linkedin.com/in/zohair-khawaja-ledger",
        "twitter": "https://twitter.com/zohair_chain",
        "website": "https://ledgerworks.io",
        "company": "LedgerWorks Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/ledgerworks.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 2,
        "sessions": ["SESS_HCK02", "SESS_HCK04"]
      },
      {
        "speakerId": "SPK_HCK03",
        "name": "Raymond Vance",
        "designation": "Principal Real-Time Systems Architect",
        "bio": "Raymond codes low-latency cluster messaging infrastructures handling massive concurrent transactional streams across multiple isolated cloud regions.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/raymond_vance.jpg",
        "sessionTitle": "Engineering Resilient Micro-Second Message Routing Pipelines under Extreme Traffic Spikes",
        "email": "r.vance@stream-labs.net",
        "linkedin": "https://linkedin.com/in/raymond-vance-stream",
        "twitter": "https://twitter.com/ray_stream_ops",
        "website": "https://stream-labs.net",
        "company": "StreamLabs Solutions Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/streamlabs.png",
        "isKeynote": false,
        "isPanelist": false,
        "order": 3,
        "sessions": ["SESS_HCK03"]
      },
      {
        "speakerId": "SPK_HCK04",
        "name": "Elena Rostova",
        "designation": "Principal Security Engineer",
        "bio": "Elena hardens system container configurations and models context-aware automated patch execution loops inside distributed cluster layouts.",
        "profileImage": "https://storage.googleapis.com/event-assets/speakers/elena_rostova.jpg",
        "sessionTitle": "Formulating Runtime Code Isolation Policies inside Competitive Multi-Tenant Clusters",
        "email": "e.rostova@defenselabs.org",
        "linkedin": "https://linkedin.com/in/elena-rostova-defense",
        "twitter": "https://twitter.com/elena_sec_ops",
        "website": "https://defenselabs.org",
        "company": "DefenseLabs Global",
        "companyLogo": "https://storage.googleapis.com/event-assets/companies/defenselabs.png",
        "isKeynote": false,
        "isPanelist": true,
        "order": 4,
        "sessions": ["SESS_HCK04", "SESS_HCK05"]
      }
    ],
    "agenda": [
      {
        "sessionId": "SESS_HCK01",
        "title": "Keynote Opening: Structural Attack Vectors Targeting Ephemeral Consensus Topologies",
        "type": "keynote",
        "status": "confirmed",
        "date": "2026-12-04",
        "startTime": "17:30",
        "endTime": "19:00",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Hackathon Stream Portal",
        "room": "Main Stage Node",
        "building": "Cloud Infrastructure Mesh",
        "floor": "Not Applicable",
        "capacity": 300,
        "speakerNames": ["Dr. Zainab Mahmood"],
        "description": "Explaining the competitive challenge matrices and detailing system level network exploitation risks targeting distributed validation setups under load.",
        "activities": [
          { "time": "17:00-17:30", "description": "Reviewing hackathon submission rules, score tracking arrays, and milestone timelines", "type": "registration" },
          { "time": "17:30-18:30", "description": "Analyzing structural consensus loop collapse patterns during network routing simulation splits", "type": "presentation" },
          { "time": "18:30-19:00", "description": "Open live chat question routing tracking block covering base API constraints", "type": "discussion" }
        ],
        "notes": "Attendance is mandatory for all cleared engineering competitor tracks.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HCK01.mp4",
        "feedbackFormUrl": "https://forms.google.com/hck-sess-001",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 300,
        "currentAttendees": 254,
        "customFields": {}
      },
      {
        "sessionId": "SESS_HCK02",
        "title": "Optimizing Block Serialization Latency Parameters inside Custom Node Engines",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-05",
        "startTime": "10:00",
        "endTime": "11:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Technical Training Annex",
        "room": "Workshop Room 1",
        "building": "Cloud Infrastructure Mesh",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Zohair Khawaja"],
        "description": "Drilling deep into memory layouts tuning practices, thread execution lock reductions, and modern custom data serialization algorithms implementation steps.",
        "activities": [
          { "time": "10:00-10:45", "description": "Writing highly efficient block layout structures using custom binary mapping models", "type": "presentation" },
          { "time": "10:45-11:30", "description": "Measuring raw execution time latency improvements across prototype systems modules", "type": "presentation" }
        ],
        "notes": "Highly relevant for engineering paths targeting performance score tracking multipliers.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HCK02.mp4",
        "feedbackFormUrl": "https://forms.google.com/hck-sess-002",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 142,
        "customFields": {
          "githubRepo": "https://github.com/ledgerworks-global/fast-serialization-templates"
        }
      },
      {
        "sessionId": "SESS_HCK03",
        "title": "Engineering Resilient Micro-Second Message Routing Pipelines under Extreme Traffic Spikes",
        "type": "workshop",
        "status": "confirmed",
        "date": "2026-12-05",
        "startTime": "14:00",
        "endTime": "15:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Performance Diagnostic Suite",
        "room": "Workshop Room 2",
        "building": "Cloud Infrastructure Mesh",
        "floor": "Not Applicable",
        "capacity": 120,
        "speakerNames": ["Raymond Vance"],
        "description": "Practical session setting up low latency streaming queues optimized to retain data sorting orders across highly distributed network cluster failures.",
        "activities": [
          { "time": "14:00-14:30", "description": "Formulating queue partition balancing strategies inside distributed system structures", "type": "presentation" },
          { "time": "14:30-15:15", "description": "Writing custom event routing loops inside test platform execution sandboxes", "type": "workshop", "requirements": ["IDE compiler environment running cleanly", "Access parameters verified"] },
          { "time": "15:15-15:30", "description": "Testing message capture completion rates under synthetic cluster split scenarios", "type": "workshop" }
        ],
        "notes": "Code repository blueprints will release inside internal channel chat loops.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HCK03.mp4",
        "feedbackFormUrl": "https://forms.google.com/hck-sess-003",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 120,
        "currentAttendees": 110,
        "customFields": {
          "githubRepo": "https://github.com/streamlabs-global/resilient-message-router"
        }
      },
      {
        "sessionId": "SESS_HCK04",
        "title": "Panel: Mid-Way Competitor Code Optimization Structural Review",
        "type": "panel",
        "status": "confirmed",
        "date": "2026-12-06",
        "startTime": "09:00",
        "endTime": "10:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Hackathon Stream Portal",
        "room": "Main Stage Node",
        "building": "Cloud Infrastructure Mesh",
        "floor": "Not Applicable",
        "capacity": 300,
        "speakerNames": ["Dr. Zainab Mahmood", "Zohair Khawaja", "Elena Rostova"],
        "description": "Vetting panel evaluation tracking common compilation hurdles, performance optimization bugs, and structural security mistakes seen across early repository tags.",
        "activities": [
          { "time": "09:00-09:50", "description": "Analyzing typical performance block patterns submitted inside early competition phases", "type": "discussion" },
          { "time": "09:50-10:30", "description": "Interactive system troubleshooting review tracing common execution exceptions", "type": "discussion" }
        ],
        "notes": "Critical monitoring checkpoint for all active developer teams tracks.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HCK04.mp4",
        "feedbackFormUrl": "https://forms.google.com/hck-sess-004",
        "isRecordingAvailable": true,
        "isRegistrationRequired": false,
        "maxAttendees": 300,
        "currentAttendees": 240,
        "customFields": {}
      },
      {
        "sessionId": "SESS_HCK05",
        "title": "Formulating Runtime Code Isolation Policies inside Competitive Multi-Tenant Clusters",
        "type": "talk",
        "status": "confirmed",
        "date": "2026-12-06",
        "startTime": "13:00",
        "endTime": "14:30",
        "duration": "90 minutes",
        "timezone": "PKT",
        "location": "Virtual Technical Training Annex",
        "room": "Workshop Room 1",
        "building": "Cloud Infrastructure Mesh",
        "floor": "Not Applicable",
        "capacity": 150,
        "speakerNames": ["Elena Rostova"],
        "description": "Constructing dynamic system constraints utilizing low level namespace boundary parameters to neutralize rogue resource allocation behaviors within automated execution grids.",
        "activities": [
          { "time": "13:00-13:45", "description": "Mapping cgroup threshold configuration controls across dynamically scaled sandbox containers", "type": "presentation" },
          { "time": "13:45-14:30", "description": "Measuring core resource tracking leak deviations during aggressive thread utilization tests", "type": "presentation" }
        ],
        "notes": "Essential overview for platform operations teams and infrastructure security leads.",
        "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_HCK05.mp4",
        "feedbackFormUrl": "https://forms.google.com/hck-sess-005",
        "isRecordingAvailable": true,
        "isRegistrationRequired": true,
        "maxAttendees": 150,
        "currentAttendees": 118,
        "customFields": {}
      }
    ],
    "vendorRequirements": [
      {
        "requirementId": "VR_HCK01",
        "serviceCategory": "custom",
        "description": "Automated evaluation engine setup to continuous score code repositories updates and maintain live leaderboard statistics graphs.",
        "budget": 110000,
        "status": "assigned",
        "assignedVendorId": "VND_TST_808",
        "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "requestedAt": "2026-09-10T14:00:00Z",
        "assignedAt": "2026-10-05T11:00:00Z",
        "completedAt": null,
        "notes": "Must deliver sub-second telemetry response curves to maintain participant dashboard updates."
      }
    ],
    "teamMembers": [
      {
        "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
        "role": "organizer",
        "permissions": ["manage_all"],
        "addedAt": "2026-07-01T08:00:00Z",
        "isActive": true
      }
    ],
    "createdAt": "2026-07-11T10:00:00Z",
    "updatedAt": "2026-10-05T11:00:00Z",
    "publishedAt": "2026-10-08T09:00:00Z",
    "eventStartTime": "2026-12-04T12:00:00Z",
    "eventEndTime": "2026-12-06T12:00:00Z",
    "archivedAt": null,
    "deletedAt": null
  },{
  "eventId": "EVT_2w3x4y5z6a7b8c9d0e1f",
  "organizerId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
  "title": "Corporate B2B Sales Funnel Optimization & Channel Management Intensive",
  "description": "A comprehensive managerial training program designed for revenue operations managers, national channel directors, and enterprise sales leads. The framework traces conversion tracking setups, long lifecycle corporate pipeline structures, automated lead score grading algorithms, and complex value model iterations.",
  "shortDescription": "Mastering high-value corporate deal generation mechanics, automated outreach metrics, and revenue alignment loops.",
  "category": "business",
  "eventType": "training",
  "format": "physical",
  "language": "en",
  "schedule": {
    "startDate": "2026-11-10",
    "endDate": "2026-11-11",
    "startTime": "09:00",
    "endTime": "17:00",
    "timezone": "PKT",
    "isRecurring": false,
    "recurrencePattern": null
  },
  "location": {
    "venueName": "Avari Towers Khursheed Mahal Hall",
    "address": "Fatima Jinnah Road",
    "city": "Karachi",
    "country": "Pakistan",
    "coordinates": {
      "latitude": 24.8534,
      "longitude": 67.0345
    },
    "meetingPlatform": "Custom",
    "meetingLink": "https://revops.avari.pk",
    "meetingId": "REVOPS2026",
    "meetingPassword": "pipeline_velocity",
    "parkingInfo": "Complimentary secure basement parking verification stamps delivered at main reception desk slots.",
    "accessibilityInfo": "Ground level corridor layouts with step-free entrance ramps and elevator access nodes verified throughout.",
    "nearbyHotels": [
      "Movenpick Hotel Karachi",
      "Pearl Continental Hotel Karachi"
    ],
    "nearbyRestaurants": [
      "Lal Qila Restaurant",
      "Asia Live Buffet"
    ]
  },
  "bannerImage": "https://storage.googleapis.com/event-assets/banners/b2b_sales_2026.jpg",
  "galleryImages": [
    "https://storage.googleapis.com/event-assets/gallery/b2b_hall.jpg",
    "https://storage.googleapis.com/event-assets/gallery/b2b_workshop.jpg",
    "https://storage.googleapis.com/event-assets/gallery/b2b_lounge.jpg"
  ],
  "promoVideoUrl": "https://youtube.com/watch?v=b2b_promo_2026",
  "capacity": {
    "totalSeats": 150,
    "reservedSeats": 20,
    "availableSeats": 130,
    "waitingListEnabled": true,
    "waitingListCapacity": 30,
    "maxRegistrationsPerUser": 3
  },
  "registration": {
    "registrationOpenDate": "2026-08-10",
    "registrationCloseDate": "2026-11-06",
    "requiresApproval": false,
    "customForm": [
      {
        "fieldId": "average_deal_size",
        "label": "Average Annual Contract Value (ACV)",
        "type": "dropdown",
        "options": ["Under 1 Million PKR", "1M - 5 Million PKR", "Greater than 5 Million PKR"],
        "required": true,
        "helpText": "Helps group workshop cohorts based on typical corporate operational realities"
      }
    ],
    "earlyBirdDeadline": "2026-09-20",
    "groupRegistrationEnabled": true,
    "groupDiscountEnabled": true
  },
  "pricing": {
    "isFree": false,
    "currency": "PKR",
    "tiers": [
      {
        "name": "Corporate Delegate Full Access Ticket",
        "price": 14000,
        "availableUntil": "2026-11-06",
        "seats": 130,
        "description": "Includes all training material assets distribution packages, catered hot buffet lunches, and networking lounge access."
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
      "percentage": 15
    }
  },
  "speakers": [
    {
      "speakerId": "SPK_B2B01",
      "name": "Khurram Zafar",
      "designation": "Managing Director of Growth Metrics",
      "bio": "Khurram structures scalable outbound business pipeline frameworks, advising over 30 growth-stage corporate networks on enterprise acquisition optimizations.",
      "profileImage": "https://storage.googleapis.com/event-assets/speakers/khurram_zafer.jpg",
      "sessionTitle": "Keynote: Formulating High Velocity Deal Ingestion Loops within Complex Enterprise Funnels",
      "email": "khurram@growth-metrics.io",
      "linkedin": "https://linkedin.com/in/khurram-zafar-growth",
      "twitter": "https://twitter.com/khurram_saas",
      "website": "https://growth-metrics.io",
      "company": "Growth Metrics Advisors",
      "companyLogo": "https://storage.googleapis.com/event-assets/companies/growthmetrics.png",
      "isKeynote": true,
      "isPanelist": true,
      "order": 1,
      "sessions": ["SESS_B2B01", "SESS_B2B04"]
    },
    {
      "speakerId": "SPK_B2B02",
      "name": "Raza Mikhael",
      "designation": "VP of Revenue Operations",
      "bio": "Raza structures structural pipeline adjustments transitioning enterprise networks away from unstructured tracking forms into high-accuracy automated analytics nodes.",
      "profileImage": "https://storage.googleapis.com/event-assets/speakers/raza_mikhael.jpg",
      "sessionTitle": "Engineering Context-Aware Lead Scoring Algorithms inside Live Customer Data Platforms",
      "email": "raza@revops-foundry.com",
      "linkedin": "https://linkedin.com/in/raza-mikhael-revops",
      "twitter": "https://twitter.com/raza_revops",
      "website": "https://revops-foundry.com",
      "company": "RevOps Foundry",
      "companyLogo": "https://storage.googleapis.com/event-assets/companies/revops.png",
      "isKeynote": false,
      "isPanelist": true,
      "order": 2,
      "sessions": ["SESS_B2B02", "SESS_B2B04"]
    },
    {
      "speakerId": "SPK_B2B03",
      "name": "Amina Baig",
      "designation": "Head of Product Experience Engineering",
      "bio": "Amina models specialized B2B onboarding user flows, optimizing software instrumentation to capture functional feature adoption milestones.",
      "profileImage": "https://storage.googleapis.com/event-assets/speakers/amina_baig.jpg",
      "sessionTitle": "Product-Led Ingestion: Aligning System Usage Signals with Sales Outbound Funnels",
      "email": "amina.baig@saas-labs.net",
      "linkedin": "https://linkedin.com/in/amina-baig-product",
      "twitter": "https://twitter.com/amina_product",
      "website": "https://saas-labs.net",
      "company": "SaaS Labs Inc",
      "companyLogo": "https://storage.googleapis.com/event-assets/companies/saaslabs.png",
      "isKeynote": false,
      "isPanelist": false,
      "order": 3,
      "sessions": ["SESS_B2B03"]
    },
    {
      "speakerId": "SPK_B2B04",
      "name": "Sarah Mansoor",
      "designation": "Enterprise Customer Success Director",
      "bio": "Sarah manages high-value contract retention portfolios, constructing mathematical model configurations to systematically pinpoint upstream churn anomalies.",
      "profileImage": "https://storage.googleapis.com/event-assets/speakers/sarah_mansoor.jpg",
      "sessionTitle": "Maximizing Contract Expansion: Turning Net Retention Rates into Growth Foundations",
      "email": "s.mansoor@successdata.org",
      "linkedin": "https://linkedin.com/in/sarah-mansoor-success",
      "twitter": "https://twitter.com/sarah_success",
      "website": "https://successdata.org",
      "company": "SuccessData Insights",
      "companyLogo": "https://storage.googleapis.com/event-assets/companies/successdata.png",
      "isKeynote": false,
      "isPanelist": true,
      "order": 4,
      "sessions": ["SESS_B2B04", "SESS_B2B05"]
    },
    {
      "speakerId": "SPK_B2B05",
      "name": "Zayd Farooq",
      "designation": "Lead CRM Platform Architect",
      "bio": "Zayd develops custom synchronization logic layers linking operational feature state stores directly into sales pipeline automation nodes.",
      "profileImage": "https://storage.googleapis.com/event-assets/speakers/zayd_farooq.jpg",
      "sessionTitle": "Structuring Low-Latency Cross-Platform Data Sync Arrays for RevOps Execution",
      "email": "zayd@edutech-solutions.com",
      "linkedin": "https://linkedin.com/in/zayd-farooq-edtech",
      "twitter": "https://twitter.com/zayd_edtech",
      "website": "https://edutech-solutions.com",
      "company": "EduTech Solutions Corp",
      "companyLogo": "https://storage.googleapis.com/event-assets/companies/edutech.png",
      "isKeynote": false,
      "isPanelist": false,
      "order": 5,
      "sessions": ["SESS_B2B06"]
    }
  ],
  "agenda": [
    {
      "sessionId": "SESS_B2B01",
      "title": "Keynote: Formulating High Velocity Deal Ingestion Loops within Complex Enterprise Funnels",
      "type": "keynote",
      "status": "confirmed",
      "date": "2026-11-10",
      "startTime": "09:30",
      "endTime": "11:00",
      "duration": "90 minutes",
      "timezone": "PKT",
      "location": "Khursheed Mahal Hall A",
      "room": "Zone Alpha",
      "building": "Main Avari Structure",
      "floor": "Ground Floor",
      "capacity": 150,
      "speakerNames": ["Khurram Zafar"],
      "description": "A paradigm shift mapping out standard operating procedures to process complex inbound corporate entities at high speeds without manual classification bottlenecks.",
      "activities": [
        {
          "time": "09:30-10:00",
          "description": "Deconstructing operational execution leaks inside multi-tiered B2B pipeline lifecycles",
          "type": "presentation"
        },
        {
          "time": "10:00-11:00",
          "description": "Constructing robust velocity orchestration rules templates live",
          "type": "presentation"
        }
      ],
      "notes": "Highly critical for enterprise channel managers and VP-level directors.",
      "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_B2B01.mp4",
      "feedbackFormUrl": "https://forms.google.com/b2b-sess-001",
      "isRecordingAvailable": true,
      "isRegistrationRequired": true,
      "maxAttendees": 150,
      "currentAttendees": 128,
      "customFields": {}
    },
    {
      "sessionId": "SESS_B2B02",
      "title": "Engineering Context-Aware Lead Scoring Algorithms inside Live Customer Data Platforms",
      "type": "workshop",
      "status": "confirmed",
      "date": "2026-11-10",
      "startTime": "11:30",
      "endTime": "13:00",
      "duration": "90 minutes",
      "timezone": "PKT",
      "location": "Khursheed Mahal Hall B",
      "room": "Zone Beta",
      "building": "Main Avari Structure",
      "floor": "Ground Floor",
      "capacity": 80,
      "speakerNames": ["Raza Mikhael"],
      "description": "Practical simulation logic walkthrough setting up multi-factor weighted behavioral matrices inside relational customer layers.",
      "activities": [
        {
          "time": "11:30-12:00",
          "description": "Reviewing statistical regression metrics tracing user engagement patterns indicators",
          "type": "presentation"
        },
        {
          "time": "12:00-13:00",
          "description": "Formulating threshold execution parameters using spreadsheet data sets tools",
          "type": "workshop",
          "requirements": ["Laptop", "Active analytical engine interface account verified"]
        }
      ],
      "notes": "Prerequisite setup models sent via email communication channels must be accessible.",
      "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_B2B02.mp4",
      "feedbackFormUrl": "https://forms.google.com/b2b-sess-002",
      "isRecordingAvailable": true,
      "isRegistrationRequired": true,
      "maxAttendees": 80,
      "currentAttendees": 74,
      "customFields": {
        "exerciseFiles": "https://storage.googleapis.com/event-exercises/scoring_matrices_template.xlsx"
      }
    },
    {
      "sessionId": "SESS_B2B03",
      "title": "Product-Led Ingestion: Aligning System Usage Signals with Sales Outbound Funnels",
      "type": "talk",
      "status": "confirmed",
      "date": "2026-11-10",
      "startTime": "14:30",
      "endTime": "16:00",
      "duration": "90 minutes",
      "timezone": "PKT",
      "location": "Khursheed Mahal Hall A",
      "room": "Zone Alpha",
      "building": "Main Avari Structure",
      "floor": "Ground Floor",
      "capacity": 150,
      "speakerNames": ["Amina Baig"],
      "description": "Interlinking technical product usage milestones directly into automated sales routing triggers to discover hot upgrade triggers naturally.",
      "activities": [
        {
          "time": "14:30-15:15",
          "description": "Isolating product feature utilization trends that reliably signal intent parameters",
          "type": "presentation"
        },
        {
          "time": "15:15-16:00",
          "description": "Open floor dynamic debate surounding operational marketing qualification criteria adjustments",
          "type": "discussion"
        }
      ],
      "notes": "Best suited for product operations managers and sales architecture alignments.",
      "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_B2B03.mp4",
      "feedbackFormUrl": "https://forms.google.com/b2b-sess-003",
      "isRecordingAvailable": true,
      "isRegistrationRequired": true,
      "maxAttendees": 150,
      "currentAttendees": 115,
      "customFields": {}
    },
    {
      "sessionId": "SESS_B2B04",
      "title": "Panel: Balancing Outbound Enterprise Sales with Self-Service Placements",
      "type": "panel",
      "status": "confirmed",
      "date": "2026-11-11",
      "startTime": "10:00",
      "endTime": "11:30",
      "duration": "90 minutes",
      "timezone": "PKT",
      "location": "Khursheed Mahal Hall A",
      "room": "Zone Alpha",
      "building": "Main Avari Structure",
      "floor": "Ground Floor",
      "capacity": 150,
      "speakerNames": ["Khurram Zafar", "Raza Mikhael", "Sarah Mansoor"],
      "description": "Managing structural revenue organization transitions when combining developer self-service loops with high touch human validation processes.",
      "activities": [
        {
          "time": "10:00-11:00",
          "description": "Debating lead routing boundaries separating automated checkout conversions from executive pipelines",
          "type": "discussion"
        },
        {
          "time": "11:00-11:30",
          "description": "Audience interactive query triage block",
          "type": "discussion"
        }
      ],
      "notes": "Open delegate forum seating access applies.",
      "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_B2B04.mp4",
      "feedbackFormUrl": "https://forms.google.com/b2b-sess-004",
      "isRecordingAvailable": true,
      "isRegistrationRequired": false,
      "maxAttendees": 150,
      "currentAttendees": 135,
      "customFields": {}
    },
    {
      "sessionId": "SESS_B2B05",
      "title": "Maximizing Contract Expansion: Turning Net Retention Rates into Growth Foundations",
      "type": "talk",
      "status": "confirmed",
      "date": "2026-11-11",
      "startTime": "13:30",
      "endTime": "15:00",
      "duration": "90 minutes",
      "timezone": "PKT",
      "location": "Khursheed Mahal Hall B",
      "room": "Zone Beta",
      "building": "Main Avari Structure",
      "floor": "Ground Floor",
      "capacity": 80,
      "speakerNames": ["Sarah Mansoor"],
      "description": "Formulating predictive account growth structures to upsell enterprise tier contracts systematically before base renewal deadlines approach.",
      "activities": [
        {
          "time": "13:30-14:15",
          "description": "Weighting feature consumption thresholds that indicate multi-seat enterprise expansion readlines",
          "type": "presentation"
        },
        {
          "time": "14:15-15:00",
          "description": "Reviewing contract lifecycle modification frameworks and account optimization timelines",
          "type": "presentation"
        }
      ],
      "notes": "Essential course block for customer success analytics leads.",
      "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_B2B05.mp4",
      "feedbackFormUrl": "https://forms.google.com/b2b-sess-005",
      "isRecordingAvailable": true,
      "isRegistrationRequired": true,
      "maxAttendees": 80,
      "currentAttendees": 62,
      "customFields": {}
    },
    {
      "sessionId": "SESS_B2B06",
      "title": "Structuring Low-Latency Cross-Platform Data Sync Arrays for RevOps Execution",
      "type": "workshop",
      "status": "confirmed",
      "date": "2026-11-11",
      "startTime": "15:30",
      "endTime": "17:00",
      "duration": "90 minutes",
      "timezone": "PKT",
      "location": "Khursheed Mahal Hall B",
      "room": "Zone Beta",
      "building": "Main Avari Structure",
      "floor": "Ground Floor",
      "capacity": 80,
      "speakerNames": ["Zayd Farooq"],
      "description": "Technical data pipeline setup mapping telemetry hooks cleanly across distributed CRM nodes and production accounting logs.",
      "activities": [
        {
          "time": "15:30-16:00",
          "description": "Reviewing data architecture schema normalizations to isolate synchronization error tracking points",
          "type": "presentation"
        },
        {
          "time": "16:00-17:00",
          "description": "Live orchestration setup connecting API webhooks to downstream workflow logs",
          "type": "workshop",
          "requirements": ["Laptop", "Git client setup running cleanly"]
        }
      ],
      "notes": "Intended primarily for CRM technical engineers and data integration specialists.",
      "recordingUrl": "https://storage.googleapis.com/event-recordings/SESS_B2B06.mp4",
      "feedbackFormUrl": "https://forms.google.com/b2b-sess-006",
      "isRecordingAvailable": true,
      "isRegistrationRequired": true,
      "maxAttendees": 80,
      "currentAttendees": 54,
      "customFields": {
        "githubRepo": "https://github.com/edutech-solutions/revops-crm-sync-blueprint"
      }
    }
  ],
  "vendorRequirements": [
    {
      "requirementId": "VR_B2B01",
      "serviceCategory": "catering",
      "description": "Premium day conference buffet catering array and separate coffee buffer lines management for B2B pipeline intensive.",
      "budget": 340000,
      "status": "assigned",
      "assignedVendorId": "V_a3jogRG5fRezebhMOWyc8XgNK9f1",
      "requestedBy": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "requestedAt": "2026-08-10T14:15:22Z",
      "assignedAt": "2026-08-15T11:04:12Z",
      "completedAt": null,
      "notes": "Maintain continuous high-tea installation access routes set adjacent across the main networking loops borders."
    }
  ],
  "teamMembers": [
    {
      "userId": "O_LDTZmbtrdKg5Scr6d4mEMzIiinD2",
      "role": "organizer",
      "permissions": ["manage_all"],
      "addedAt": "2026-07-01T08:00:00Z",
      "isActive": true
    }
  ],
  "createdAt": "2026-07-05T14:00:00Z",
  "updatedAt": "2026-08-15T11:04:12Z",
  "publishedAt": "2026-08-18T09:00:00Z",
  "eventStartTime": "2026-11-10T04:00:00Z",
  "eventEndTime": "2026-11-11T12:00:00Z",
  "archivedAt": null,
  "deletedAt": null
}
]

export const moreMockEvents: EventModel[] = rawmoreMockEvents.map(item => EventModel.fromJson(item));