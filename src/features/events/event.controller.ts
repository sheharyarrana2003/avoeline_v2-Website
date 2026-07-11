import { mockEvents } from "@/app/mockdata/events.mock";

export const EventController = {
    async getAllEvents() {
        return mockEvents;
    }
    ,
    async getEventByID(id: string) {
        const event = mockEvents.find((e) => e.id == id);
        return event || null;
    }
}