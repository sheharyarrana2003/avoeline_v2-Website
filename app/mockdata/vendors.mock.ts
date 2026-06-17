export const mockVendors = [
  {
    "vendorId": "V001",
    "userId": "U006",
    "businessName": "Perfect Catering Services",
    "contact": {
      "primaryPhone": "+923001234567",
      "secondaryPhone": "+923001234568",
      "businessEmail": "info@perfectcatering.pk",
      "website": "https://perfectcatering.pk",
      "address": {
        "street": "123 Commercial Area Phase 4",
        "city": "Lahore",
        "country": "Pakistan",
        "coordinates": { "lat": 31.5204, "lng": 74.3587 }
      }
    },
    "serviceCategories": ["catering", "event_management"],
    "portfolio": {
      "images": [
        {
          "url": "https://storage.events.com/portfolio/V001/img1.jpg",
          "caption": "Techverse Conference Lunch Buffet",
          "eventType": "conference",
          "date": "2025-10-15"
        },
        {
          "url": "https://storage.events.com/portfolio/V001/img2.jpg",
          "caption": "Executive High Tea Setup",
          "eventType": "workshop",
          "date": "2026-02-10"
        }
      ],
      "videos": ["https://storage.events.com/portfolio/V001/vid1.mp4"],
      "clientTestimonials": [
        {
          "clientName": "Arithmiks",
          "testimonial": "Perfect Catering delivered exactly as promised. The food was warm and the staff was very professional during our annual corporate retreat.",
          "rating": 5,
          "eventDate": "2025-10-15"
        }
      ],
      "pastEvents": ["evt_prev_01", "evt_prev_02"]
    },
    "pricingPackages": [
      {
        "packageId": "PKG001",
        "name": "Standard Conference Box",
        "description": "Individual boxed lunches perfect for quick conference breaks.",
        "inclusions": ["Club Sandwich", "Fries", "Juice Box", "Brownie"],
        "price": 850,
        "minOrder": 50,
        "customizationOptions": ["vegetarian", "gluten-free"]
      },
      {
        "packageId": "PKG002",
        "name": "Premium Buffet Spread",
        "description": "Full buffet setup with chafing dishes and service staff.",
        "inclusions": ["Chicken Karahi", "Biryani", "Naan", "Salad", "Trifle"],
        "price": 2500,
        "minOrder": 100,
        "customizationOptions": ["spice_level", "dessert_choice"]
      }
    ],
    "ratings": {
      "averageRating": 4.8,
      "totalReviews": 42,
      "breakdown": {
        "5": 35,
        "4": 6,
        "3": 1,
        "2": 0,
        "1": 0
      }
    },
    "stats": {
      "totalBookings": 85,
      "completedBookings": 82,
      "cancellationRate": 3.5,
      "repeatClients": 25,
      "totalRevenue": 12500000,
      "avgResponseTime": "1 hour"
    },
    "verification": {
      "verified": true,
      "verificationMethod": "document_review",
      "verifiedAt": "2024-01-10T09:00:00Z",
      "verificationBadges": ["top_rated", "food_safety_certified"]
    },
    "settings": {
      "autoAcceptQuotes": false,
      "notificationPreferences": {
        "newQuotes": true,
        "bookingConfirmations": true,
        "paymentReceipts": true,
        "reviews": true
      },
      "commissionRate": 10
    },
    "status": "active",
    "featured": true,
    "createdAt": "2024-01-05T14:30:00Z",
    "updatedAt": "2026-06-01T10:00:00Z",
    "lastActive": "2026-06-15T18:00:00Z"
  },
  {
    "vendorId": "V005",
    "userId": "U007",
    "businessName": "Sound & Vision Pro",
    "contact": {
      "primaryPhone": "+923219876543",
      "secondaryPhone": "+923219876544",
      "businessEmail": "bookings@soundvision.pk",
      "website": "https://soundvision.pk",
      "address": {
        "street": "45 Tech Market, Gulberg",
        "city": "Lahore",
        "country": "Pakistan",
        "coordinates": { "lat": 31.5085, "lng": 74.3487 }
      }
    },
    "serviceCategories": ["av_equipment", "lighting"],
    "portfolio": {
      "images": [
        {
          "url": "https://storage.events.com/portfolio/V005/av_setup1.jpg",
          "caption": "Main Stage Hackathon Setup",
          "eventType": "hackathon",
          "date": "2026-01-20"
        }
      ],
      "videos": [],
      "clientTestimonials": [
        {
          "clientName": "FAST-NUCES Events Society",
          "testimonial": "Flawless audio execution. The wireless mics worked perfectly throughout the entire auditorium without any feedback issues.",
          "rating": 5,
          "eventDate": "2026-01-20"
        }
      ],
      "pastEvents": ["evt_prev_04"]
    },
    "pricingPackages": [
      {
        "packageId": "PKG_AV_01",
        "name": "Basic Seminar Kit",
        "description": "Essential AV setup for small rooms.",
        "inclusions": ["1 Projector (1080p)", "1 Projection Screen", "2 Wireless Mics", "Basic PA Speaker pair"],
        "price": 25000,
        "minOrder": 1,
        "customizationOptions": ["add_clicker", "add_lapel_mic"]
      },
      {
        "packageId": "PKG_AV_02",
        "name": "Auditorium Full System",
        "description": "Comprehensive audio-visual solution for large halls.",
        "inclusions": ["Dual 4K Projectors", "Line Array Speakers", "Digital Mixer Board", "6 Wireless Mics", "On-site Technician"],
        "price": 85000,
        "minOrder": 1,
        "customizationOptions": ["stage_lighting", "live_stream_camera"]
      }
    ],
    "ratings": {
      "averageRating": 4.5,
      "totalReviews": 18,
      "breakdown": {
        "5": 12,
        "4": 4,
        "3": 2,
        "2": 0,
        "1": 0
      }
    },
    "stats": {
      "totalBookings": 35,
      "completedBookings": 32,
      "cancellationRate": 8.5,
      "repeatClients": 10,
      "totalRevenue": 2150000,
      "avgResponseTime": "4 hours"
    },
    "verification": {
      "verified": true,
      "verificationMethod": "manual_review",
      "verifiedAt": "2025-03-15T11:00:00Z",
      "verificationBadges": ["equipment_insured"]
    },
    "settings": {
      "autoAcceptQuotes": false,
      "notificationPreferences": {
        "newQuotes": true,
        "bookingConfirmations": true,
        "paymentReceipts": false,
        "reviews": true
      },
      "commissionRate": 10
    },
    "status": "active",
    "featured": false,
    "createdAt": "2025-03-10T09:15:00Z",
    "updatedAt": "2026-05-20T11:30:00Z",
    "lastActive": "2026-06-14T09:45:00Z"
  }
]