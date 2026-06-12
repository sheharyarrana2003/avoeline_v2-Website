import {mockEvents} from "@/app/mockdata/events.mock"

export const EventService = {
    async getEventByID(id: string) {
      const e = mockEvents.filter(
            me => {
                const organizer_match = me.organizerId === id;
                return organizer_match;
            }
        )
    }
    ,
    async getAllEvents() {
       return mockEvents;
    }
    ,
    async getEventsByStatus(organizer_id : string,status: string) {
        const e = mockEvents.filter(
            me => {
                const organizer_match = me.organizerId === organizer_id;
                const status_match = status === "all" || me.status.toLowerCase() === status.toLowerCase();
                // console.log("For -> ", me.id)
                // console.log(organizer_id);
                // console.log(status_match);
                // console.log("Final verdict ->",status_match && organizer_match);
                // console.log("");

                return status_match && organizer_match;
            }
        )

        return e;
    }
}