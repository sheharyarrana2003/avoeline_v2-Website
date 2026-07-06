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


export async function seedEvents() {
    for (const x of mockCertificates) {
        const docRef = doc(db, "certificates", x.certificateId);
        await setDoc(docRef, x)
        console.log(" seeded", " ",x.certificateId)
    }

    
    
 


}

seedEvents();