import { mockSpeakers } from "@/app/mockdata/speakers.mock";

export const SpeakerService = {
    async getAllSpeakers(organizer_id: string, event_id: string) {
        const speakers_of_organizer = mockSpeakers.filter(
            (ms) => {
                return (ms.organizerId === organizer_id && ms.eventId === event_id)
            }
        );

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