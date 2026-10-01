# Implementation Plan: Ticketing & Registration Engine

Extend the existing registration flow in Avoeline to support full ticket-tier management, dynamic category custom attributes, promo code validation with discounts, and payment status tracking.

---

## 1. Firestore Collections & Schema Additions

### 1. `ticketTiers` (`COLLECTIONS.TICKET_TIERS = "ticketTiers"`)
```ts
export interface TicketTierDoc {
    id: string;
    eventId: string;
    name: string;
    price: number; // 0 = free
    currency: string; // e.g. "PKR", "USD"
    quantityLimit?: number; // optional max capacity
    quantitySold: number; // tracked live
    createdAt: string;
    updatedAt?: string;
}
```

### 2. `promoCodes` (`COLLECTIONS.PROMO_CODES = "promoCodes"`)
```ts
export interface PromoCodeDoc {
    id: string;
    eventId: string;
    code: string; // uppercase alphanumeric
    discountType: "percent" | "flat";
    value: number; // e.g., 20 for 20% or 500 for flat 500 PKR
    usageLimit?: number; // optional max usage
    usageCount: number; // current usages
    expiresAt?: string | null; // ISO date string
    active: boolean;
    createdAt: string;
}
```

### 3. Updated `registrations` Collection
Top-level fields to add to `Registration` (`src/services/models/reg.type.ts`):
```ts
export interface Registration {
    // ... existing fields ...
    ticketTierId: string;
    amountPaid: number;
    promoCodeUsed?: string;
    paymentStatus: "free" | "pending" | "paid" | "failed";
    categoryFieldValues?: Record<string, any>;
}
```

---

## 2. Component Breakdown & Execution Plan

### Step 1: Ticket Tier Builder & Promo Code Management (Organizer Side)
- **Navigation**:
  - Add a **Tickets** tab to `app/organizer/[organizer_id]/events/[eventId]/layout.tsx`.
- **Pages & Components**:
  - Create `app/organizer/[organizer_id]/events/[eventId]/tickets/page.tsx`.
  - Create `src/features/ticketing/components/TicketTierBuilder.tsx`:
    - Add, edit, and delete ticket tiers (`name`, `price`, `currency`, `quantityLimit`).
    - Visual progress bar indicator for each tier: `quantitySold` vs `quantityLimit` (e.g., "45 / 100 sold (45%)" or "Unlimited").
    - Highlight "Sold Out" state when `quantitySold >= quantityLimit`.
  - Create `src/features/ticketing/components/PromoCodeManager.tsx`:
    - Organizer can view, create, toggle active state, and delete promo codes (`code`, `discountType`, `value`, `usageLimit`, `expiresAt`).
    - Displays `usageCount` vs `usageLimit` progress.
  - Create `src/features/ticketing/ticketing.service.ts` and `src/features/ticketing/actions/ticketing.action.ts`:
    - Server actions and query functions for Firestore CRUD operations on `ticketTiers` and `promoCodes`.

### Step 2: Registration Form Tier Selector & Dynamic Field Integration
- **Public Event Page** (`app/events/[eventId]/page.tsx`):
  - Query active `ticketTiers` for the event.
  - If the event has `categorySuperId`, fetch the corresponding `categoryFieldSets` fields via `CategoryEngineService.getFieldSet(event.categorySuperId)`.
  - Pass `ticketTiers` and `categoryFields` into `<RegistrationForm />`.
- **Registration Form** (`src/features/registration/components/RegistrationForm.tsx`):
  - Render an interactive Ticket Tier Selector cards/radio list:
    - Display tier name, formatted price (or "Free"), and availability progress.
    - If `quantityLimit` is defined and `quantitySold >= quantityLimit`, disable the tier with a "Sold Out" badge.
    - Default to the first available tier or free tier.
  - Integrate `<DynamicFieldRenderer />` from `src/features/taxonomy/components/DynamicFieldRenderer.tsx`:
    - Render custom fields from the event's `categoryFieldSet`.
    - Maintain state for `categoryFieldValues` and pass them into registration submission.

### Step 3: Promo Code Input & Validation
- **Registration Form Client**:
  - Add an optional promo code input with a quick "Apply" button or validation check.
  - Real-time client preview of discounted price when valid code is applied.
  - Inline error feedback if the code is invalid, inactive, expired, or exhausted.
- **Server-Side Validation & Execution** (`registerAttendee.action.ts` & `registration.service.ts`):
  - Server-side verification of promo code against `promoCodes` collection:
    - `active === true`
    - `!expiresAt || new Date(expiresAt) > new Date()`
    - `!usageLimit || usageCount < usageLimit`
  - Compute discounted `amountPaid`:
    - Percent: `discount = (price * promo.value) / 100`
    - Flat: `discount = promo.value`
    - `amountPaid = Math.max(0, price - discount)`
  - Atomically increment `usageCount` on `promoCodes` document upon successful registration.
  - Increment `quantitySold` on the selected `ticketTiers` document.

### Step 4: Payment Status Tracking & Organizer "Mark as Paid" Toggle
- **Payment Status Initialization**:
  - For free tiers (price 0): set `paymentStatus = "free"`, `amountPaid = 0`.
  - For paid tiers: set `paymentStatus = "pending"`, `amountPaid = discountedAmount`.
  - Note in code comments: *Stripe/JazzCash gateway integration is scheduled for a later phase.*
- **Organizer Attendee List & Single Attendee Drawer**:
  - Add "Mark as Paid" toggle button for organizers in:
    - `src/features/event_attendee/components/AttendeeListItem.tsx` (quick action).
    - `src/features/event_attendee/components/SingleAttendeeView.tsx` (payment status selector and quick toggle).
  - Server action `updatePaymentStatusAction(registrationId, paymentStatus)` to update `paymentStatus` and `payment.paymentStatus`.

### Step 5: Attendee List Filters by Tier & Payment Status
- **Organizer Attendee List** (`src/features/event_attendee/components/AttendeeClientSide.tsx`):
  - Display ticket tier name and payment status badge (`free`, `pending`, `paid`, `failed`) for each row in `AttendeeListItem`.
  - Add filter controls:
    - **Filter by Ticket Tier**: All Tiers, or specific tier filter dropdown.
    - **Filter by Payment Status**: All, Free, Pending, Paid, Failed.
  - Real-time client filtering and updated metric tiles.

---

## 3. Verification Plan

### Automated Checks
- Run `npx tsc --noEmit` to verify type completeness and clean compilation.
- Test server actions and query methods with synthetic validation scripts in `scratch/`.

### Manual / Browser Verification
- Visit organizer tickets page `/organizer/[organizer_id]/events/[eventId]/tickets` to add tiers and promo codes.
- Visit public registration page `/events/[eventId]` to test:
  - Selecting ticket tiers.
  - Sold-out tier disablement.
  - Dynamic category fields rendering.
  - Applying valid, expired, and exhausted promo codes.
  - Free registration flow -> `paymentStatus: "free"`.
  - Paid registration flow -> `paymentStatus: "pending"`.
- Visit organizer attendees page `/organizer/[organizer_id]/events/[eventId]/attendees` to test:
  - Viewing tier and payment status.
  - Filtering by tier and payment status.
  - Toggling "Mark as paid".
