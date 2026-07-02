import { mockEvents } from "@/app/mockdata/events.mock"
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/data/db'
import { EventModel } from "./models/event.model";

export const EventService = {

    async getEventByID(id: string) {
        console.log("In get event this is thte id i am searching for ",id);
        if (!id){ console.warn("id is nulll brooooo") ;return null};

        const q = query(
            collection(db, "events"),
            where("id", "==", id)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log("this event doesnt exist yet");
            return new EventModel({});
        }
        console.log("found itttt ",querySnapshot.docs[0].data());
        const event: EventModel = EventModel.fromJson(querySnapshot.docs[0].data());
        return event;

    

},

    async getAllEventsByOrganizer(organizer_id: string) {
        const q = query(
            collection(db, "events"),
            where("organizerId", "==", organizer_id)
        );

        const querySnapshot = await getDocs(q);
        let arr: EventModel[] = [];

        querySnapshot.forEach((doc) => {
            console.log("in getALL events");
            console.log(doc.data());
            arr.push(EventModel.fromJson(doc.data()));
        });

        return arr;
    },
        async getRecentReg(event_id: string) {
    const q = query(collection(db, "registerations"), where("eventId", "==", event_id));
    const querySnapshot = await getDocs(q);
    let arr: EventModel[] = [];

    querySnapshot.forEach((doc) => {
        console.log(doc.data());
        arr.push(EventModel.fromJson(doc.data()));
    });

    return arr;

}
}