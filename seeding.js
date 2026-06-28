import { mockEvents } from "./app/mockdata/events.mock";
import { auth, db } from '@/data/db'
import { doc, setDoc, getDoc } from 'firebase/firestore';


export async function seedEvents() {
    for (const event of mockEvents) {
        const docRef = doc(db, "events", event.id);
        await setDoc(docRef, event)
        console.log("event seeded", event.id)
    }
}

seedEvents();