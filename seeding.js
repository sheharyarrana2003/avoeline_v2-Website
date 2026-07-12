import { mockEvents } from "./app/mockdata/events.mock";
import { auth, db } from '@/data/db'
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { mockBookings } from "./app/mockdata/bookings.mock";
import { mockVendors } from "./app/mockdata/vendors.mock.ts";
import { mockSpeakers } from "./app/mockdata/speakers.mock";
import { mockAttendee } from "./app/mockdata/attendee.mock";
import { mockUsers } from "./app/mockdata/users.mock";
import { mockReg } from "./app/mockdata/registeration.mock";
import { mockNotifications } from "./app/mockdata/notifications.mock";
import { mockCertificates } from "./app/mockdata/certificates.mock.ts";
import { moreMockEvents } from "./app/mockdata/gemini_mock_events";
import {COLLECTIONS } from "@/data/collections";



export async function seedEvents(adminDb) {
  try {
    // 1. Seed Events
    for (const x of mockEvents) {
        console.log("Seeding Event:", x.id);
      const docRef = adminDb.collection("events").doc(x.id);
      await docRef.set({...x});
      console.log("Seeded Event:", x.id);
    }

    for (const x of moreMockEvents) {
        console.log("Seeding Event:", x.id);
      const docRef = adminDb.collection("events").doc(x.id);
      await docRef.set({...x});
      console.log("Seeded Event:", x.id);
    }


    // 2. Seed Attendees
    for (const x of mockAttendee) {
      const docRef = adminDb.collection(COLLECTIONS.ATTENDEES).doc(x.attendeeId);
      await docRef.set({...x});
      console.log("Seeded Attendee:", x.attendeeId);
    }

    // 3. Seed Users
    for (const x of mockUsers) {
      const docRef = adminDb.collection(COLLECTIONS.USERS).doc(x.userId);
      await docRef.set({...x});
      console.log("Seeded User:", x.userId);
    }

    // 4. Seed Registrations
    for (const x of mockReg) {
      const docRef = adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(x.registrationId);
      await docRef.set({...x});
      console.log("Seeded Registration:", x.registrationId);
    }

    // 5. Seed Bookings
    for (const x of mockBookings) {
      const docRef = adminDb.collection(COLLECTIONS.BOOKINGS).doc(x.bookingId);
      await docRef.set({...x});
      console.log("Seeded Booking:", x.bookingId);
    }

    console.log(" Seeding completed successfully!");
  } catch (error) {
    console.error(" Error during seeding database execution:", error);
  }
}seedEvents();
