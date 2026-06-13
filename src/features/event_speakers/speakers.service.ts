import { mockSpeakers } from "@/app/mockdata/speakers.mock";

export const SpeakerService = {
    async getAllSpeakers(organizer_id: string,event_id:string){
        const speakers_of_organizer =  mockSpeakers.filter(
            (ms) =>{
                return (ms.organizer_id === organizer_id &&  ms.event_id === event_id)
            }
        );

        return speakers_of_organizer;

    }
}