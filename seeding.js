import { mockEvents } from "./app/mockdata/events.mock";
import { auth, db } from '@/data/db'
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { mockBookings } from "./app/mockdata/bookings.mock";
import { mockVendors } from "./app/mockdata/vendors.mock.ts";
import { mockSpeakers } from "./app/mockdata/speakers.mock";
import { mockAttendee } from "./app/mockdata/attendee.mock";
import { mockUsers } from "./app/mockdata/users.mock";
import { mockReg } from "./app/mockdata/registeration.mock";


export async function seedEvents() {
    // for (const event of mockEvents) {
    //     const docRef = doc(db, "events", event.id);
    //     await setDoc(docRef, event)
    //     console.log("event seeded", event.id)
    // }
  for (const x of mockUsers) {
        const docRef = doc(db, "users", x.userId);
        await setDoc(docRef, x)
        console.log("seeded", x.userId)
    }

    for (const x of mockReg) {
        const docRef = doc(db, "registerations", x.registrationId);
        await setDoc(docRef, x)
        console.log("seeded", x.registrationId)
    }

}

seedEvents();