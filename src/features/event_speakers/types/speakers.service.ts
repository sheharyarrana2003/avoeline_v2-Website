import { EventService } from "@/src/services/event.service";
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '@/data/db'
import { EventModel } from "@/src/services/models/event.model";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";

export const SpeakerService = {
    async getAllSpeakers( event_id: string) {
        const Event = await EventService.getEventByID(event_id);
        const speakers_of_organizer = Event?.speakers || [];
        return speakers_of_organizer;

    },
    async createNewSpeaker(formData: FormData, event_id: string) {
        const Event: EventModel | null = await EventService.getEventByID(event_id);
        if (Event) {
            const speakers_of_organizer = Event?.speakers || [];
            const uniqueHash = Math.random().toString(36).substring(2, 9).toUpperCase();

            const name = (formData.get("speakerName") as string) || "";
            const designation = (formData.get("title") as string) || "";
            const bio = (formData.get("bio") as string) || "";

            // Handle contact metadata parsing structures if you decide to preserve them later
            const email = (formData.get("email") as string) || "";
            const phone = (formData.get("phone") as string) || "";
            const isContactPublic = formData.get("isPublic") === "on"; // Checkboxes yield "on" when toggled active

            // Social footprints
            const linkedin = (formData.get("linkedin") as string) || "";
            const twitter = (formData.get("twitter") as string) || "";

            const purpose = (formData.get("purpose") as string) || "";
            const start_time = (formData.get("start_time") as string) || "";
            const end_time = (formData.get("end_time") as string) || "";

            // Avatar uploaded to Supabase Storage (public URL) via the form's
            // hidden profileImage input; fall back to the placeholder if none.
            const profileImage = String(formData.get("profileImage") || "/placeholders/speaker-avatar.png");
            const sessionTitle = "Assigned Speaker Session"; // Can be populated dynamically based on active selected session arrays

            const new_speaker = {
                speakerId: `SPK_${event_id}_${uniqueHash}`,
                name: name.trim(),
                designation: designation.trim(),
                bio: bio.trim(),
                profileImage: profileImage,
                sessionTitle: sessionTitle,
                purpose:purpose,
                start_time: start_time,
                end_time: end_time
            };

            Event.speakers.push(new_speaker);

            // Update only the speakers array (a plain array of plain objects).
            // Passing the whole EventModel class instance to .update() fails —
            // Firestore rejects objects created via a custom prototype.
            await adminDb.collection(COLLECTIONS.EVENTS).doc(event_id).update({ speakers: Event.speakers });
        } else {
            console.log("this event doesnt exist so how toadd a speaker to it??");
        }

        console.log("Creating a new speaker... -> ");
    }
}