import { mockEvents } from "./app/mockdata/events.mock";
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
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";



export async function seedEvents(adminDb) {
  try {
    // 1. Seed Events
    // for (const x of mockEvents) {
    //     console.log("Seeding Event:", x.id);
    //   const docRef = adminDb.collection("events").doc(x.id);
    //   await docRef.set({...x});
    //   console.log("Seeded Event:", x.id);
    // }

    // const docRef = adminDb.collection(COLLECTIONS.BOOKINGS);
    // const e = await docRef.get();

    // e.docs.forEach(async (element) => {

    //   console.log("Eleement :", element.data());
    //   console.log("Document :", element.data().bookingId);
    //   const id =  element.data().bookingId|| "random";
    //   console.log("---------");

    //   const docRefOfE = await adminDb.collection(COLLECTIONS.BOOKINGS).doc(id).update({
    //     organizerId: "LDTZmbtrdKg5Scr6d4mEMzIiinD2"
    //   }).then( console.log("Document updated successfully", id))


     
    // });





    console.log(" Seeding completed successfully!");
  } catch (error) {
    console.error(" Error during seeding database execution:", error);
  }
} seedEvents();
