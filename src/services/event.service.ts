
const base_url = process.env.NEXT_PUBLIC_API_BASE_URL

export const EventService = {
    async getEventByID(id: string) {
        console.log("this is the id in get event by id ->");
        console.log(id)
        const res = await fetch(`${base_url}/api/events/${id}`);
        const res_json = await res.json();
        return res_json.data;
    }
    ,
    async getAllEvents() {
        const res = await fetch(`${base_url}/api/events/`);
        const res_json = await res.json();
        return res_json.data;
    }
    ,
    async getEventsByStatus(status: string) {
        const res = await fetch(`${base_url}/api/events?status=${status}`);
        const json = await res.json();
        return json.data;
    }
}