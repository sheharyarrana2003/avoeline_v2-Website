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


export async function seedEvents() {
    for (const x of mockVendors) {
        const docRef = doc(db, "vendor", x.vendorId);
        await setDoc(docRef, x)
        console.log("venodr seeded",x.vendorId)
    }

        for (const x of mockBookings) {
        const docRef = doc(db, "bookings", x.bookingId);
        await setDoc(docRef, x)
        console.log("booking seeded", x.bookingId)
    }
    for (const x of mockEvents) {
        const docRef = doc(db, "events", x.id);
        await setDoc(docRef, {...x})
        console.log("event seeded", x.id)
    }

    
 


}

seedEvents();