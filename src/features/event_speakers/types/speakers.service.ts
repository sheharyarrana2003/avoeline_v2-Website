import { mockSpeakers } from "@/app/mockdata/speakers.mock";
import { EventService } from "@/src/services/event.service";

export const SpeakerService = {
    async getAllSpeakers(organizer_id: string, event_id: string) {
        const Event = await EventService.getEventByID(event_id);
        const speakers_of_organizer = Event?.speakers || [];
        return speakers_of_organizer;

    },
    async createNewSpeaker(formData: FormData) {
        const rawName = formData.get("speakerName");
        const rawCompany = formData.get("company");

        // 2. FormData values can technically be strings, Files, or null. 
        // You should convert them to strings to satisfy TypeScript.
        const name = rawName?.toString() || "";
        const company = rawCompany?.toString() || "";

        // 3. Optional: Add a simple validation check
        // if (!name || !company) {
        //     throw new Error("Missing required fields");
        // }
        console.log("Creating a new speaker... -> ", name, " -> ", company);
    }
}