# AVOELINE - Event Management Platform

## Project Description

AVOELINE is an end-to-end event management platform built specifically for Pakistan's education and corporate training sectors. It eliminates the fragmented, manual event management process (Google Forms, Excel sheets, manual certificates) by providing a single, production-grade platform where organizers can create events, manage registrations with custom forms, check attendees in via QR codes, and automatically generate and verify certificates. The platform serves students registering for university events, corporate HR teams running training programs, and event organizers managing large-scale conferences. It includes real-time analytics for organizers to track event performance and comprehensive vendor management for coordinating event services.

---

## 🚀 Live Application

**Web App**: [https://avoeline-website.vercel.app/](https://avoeline-website.vercel.app/)

**Try it out:**
1. Sign up as an attendee or organizer
2. Browse events or create your own
3. Register for an event
4. View your certificates

**Demo credentials** :
- Email: organizer_1@gmail.com
- Password: 12345678

- Email: vendor_1@gmail.com
- Password: 12345678


---

## 🎯 Features Implemented

### User Management & Authentication
- Firebase Authentication (email/password, social login)
- Role-based access control (Attendee, Organizer, Vendor, Admin)
<!-- - Student email verification (@*.edu.pk domains)
- Custom user profiles with avatar uploads
- Multi-factor authentication (MFA) support -->

### Event Management (Organizer Dashboard)
- **Event Creation**: Complete event builder with title, description, category, format (physical/virtual/hybrid)
- **Scheduling**: Date/time picker with timezone support, recurring event configuration
- **Registration Settings**: Custom form builder (text, dropdown, checkbox, file upload), approval workflow, registration deadlines, capacity management
- **Pricing Tiers**: Early bird pricing, regular pricing, student discounts (20%), group discounts (15% for 5+ attendees)
- **Speaker Management**: Speaker profiles, session assignments, bio and credentials
- **Agenda Builder**: Session scheduling, session type (talk, workshop, panel), materials (PDFs, videos, code repos), learning objectives
- **Vendor Requests**: Define services needed (catering, AV, photography) and get vendor quotes
- **Status Management**: Draft → Published → Ongoing → Completed workflow

### Registration & Attendee Experience
- **Event Discovery**: Browse events with filters (category, date, location, price range)
- **Registration Form**: Dynamic custom forms (organizer-defined questions)
- **Multi-Tier Pricing**: Auto-apply discounts based on registration date and attendee type
- **Confirmation**: Instant registration confirmation with details
- **My Registrations**: View all registered events, status, certificate links
- **Registration History**: Track all past and upcoming events

### Check-in System (Real-Time Attendance)
<!-- - **QR Code Generation**: Unique QR for each registration
- **QR Scanner**: Web-based QR scanner for instant check-in
- **Manual Check-in**: Fallback for when QR doesn't scan (search and check-in manually)
- **Real-Time Stats**: Organizer sees live check-in count and attendance rate
- **Check-in Reports**: Export attendance list and analytics -->

### Certificate Management (Automated)
- **Automatic Generation**: Certificates auto-generated after event completion (if attendee checked in)
<!-- - **PDF Templates**: Customizable certificate design (organizer can upload logo, choose colors)
- **Download & Share**: Attendees can download PDF and share on LinkedIn
- **Verification Code**: Each certificate has unique verification code for validation -->
<!-- - **Verification Portal**: Anyone can verify a certificate by code without logging in -->



### Vendor Management & Booking
- **Vendor Profiles**: Vendors can create profiles, upload portfolio (images, videos), add pricing packages
- **Service Categories**: Catering, Photography, AV, Event Management, Decoration, etc.
- **Booking Workflow**: Organizer requests service → Vendor sends quote → Negotiation → Booking confirmed
- **Contract Management**: Digital contract with terms, both parties sign electronically
<!-- - **Payment Schedule**: Installment-based (e.g., 50% advance, 50% final) with payment tracking -->
<!-- - **Quality Rating**: Organizer rates vendor after service completion (1-5 stars) -->
- **Repeat Bookings**: Vendors build reputation, organizers can see past work and reviews

### Communication & Notifications
<!-- - **Email Notifications**: Registration confirmation, event reminders (7 days, 1 day, 1 hour before), certificate ready -->
- **Push Notifications**: Web notifications for attendees (event reminders, registration updates)
<!-- - **SMS Alerts**: Critical alerts (event cancelled, registration updates) via SMS -->
<!-- - **In-App Messaging**: Organizer ↔ Attendee communication for questions -->
<!-- - **Notification Templates**: Pre-built templates for common events, customizable by organizers -->

### Analytics Dashboard
- **Real-Time Metrics**: Total registrations, check-ins count, registration rate, no-show rate
- **Registration Tracking**: Total registrations, registrations by pricing tier, registration trends over time
<!-- - **Attendee Demographics**: Geographic breakdown (cities), attendee types (student vs professional), growth chart -->
- **Event Performance**: Attendance rate, customer satisfaction rating, repeat attendees
- **Vendor Performance**: Top performing vendors, vendor rating over time, booking frequency
<!-- - **Export**: Download analytics as CSV/Excel for further analysis -->

### Admin Panel
<!-- - **User Management**: View/suspend/deactivate users, view login history
- **Event Moderation**: Approve/reject events before publishing, moderate event content
- **Vendor Verification**: Approve vendor profiles, award verification badges
- **Platform Analytics**: View platform-wide metrics and trends
- **Platform Settings**: Configure email templates, notification preferences
- **Support Tickets**: View user-reported issues, respond and resolve -->

---

### How Data Flows

**Scenario: User registers for event**

1. **Frontend** (Next.js app)
   - User fills registration form with custom questions
   - Clicks "Register" button
   - Client-side validation (email format, required fields)

2. **Server Action** (Next.js server-side code running on backend)
   - Receives form data from frontend
   - Verifies user is authenticated via Firebase token
   - Validates pricing tier (early bird still available? student discount applicable?)
   - Calculates final price with discounts
   - Creates registration record in Firestore
   - Sends confirmation email to attendee
   - Generates unique QR code for check-in

3. **Data Storage** (Firestore)
   ```
   registrations/{registrationId}
   ├── eventId: "EVT001"
   ├── userId: "U001"
   ├── status: "confirmed"
   ├── finalPrice: 1500
   ├── formResponses: {...}
   ├── qrCode: {data, imageUrl}
   ├── createdAt: timestamp
   └── checkedIn: false
   ```

4. **Frontend Updates**
   - Displays success page
   - Shows QR code for check-in
   - Adds event to "My Registrations"
   - Event appears on user's dashboard

---

## 📚 Project Structure Quick Reference

```
avoeline/
├── .next/                # Next.js build configuration artifacts
|
├── app/                  # App Router - Application Shell & Routing System
│   ├── (auth)/           # Authentication layout and route handlers
|   |
│   ├── organizer/        # Organizer dashboard and operations workspace
│   │   └── [organizer_id]/
│   │       └── layout.tsx
|   |
│   ├── vendor/           # Vendor profile management and package booking
│   │   └── [vendor_id]/
│   │       └── layout.tsx
|   |
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # Public-facing application landing view
|
├── data/                 # Database configuration layers and security rules
│   ├── admin_db.ts       # Secure administrative Firebase configuration setups
│   ├── avoelinev2-firebase-adminsdk...json
│   ├── collections.ts    # Firestore strongly typed schema boundaries
│   └── db.ts             # Initialized client-side Firebase operations
|
├── public/               # Public assets and multimedia vectors
|
├── src/                  # Enterprise domain directory core
│   └── features/         # Domain-Driven Design (DDD) feature modules
│       ├── agendas/      # Specialized Event Agenda module
│       │   ├── actions/  # Encapsulated Next.js Server Actions
│       │   ├── components/
│       │   │   ├── AgendaClientContent.tsx
│       │   │   ├── AgendaHeader.tsx
│       │   │   ├── AgendaTimeline.tsx
│       │   │   └── CreateAgendaForm.tsx
│       │   ├── types/    # Interface schema signatures
│       │   └── agenda.service.ts
│       ├── analytics/    # Metrics extraction feature module
│       └── auth/         # Profile handling module rules
|
└── package.json
```

---
