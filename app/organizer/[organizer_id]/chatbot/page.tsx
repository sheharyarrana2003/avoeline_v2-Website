import { NextResponse } from "next/server";
import OrganizerChatBotClient from "./ChatBotClient"

export default function OrganizerChatBot() {

    const handleSubmitServer = async (user_prompt: string) => {
        'use server'
        const url = `${process.env.AI_URL}${process.env.AI_API_KEY}`
        const textToProcess = `${user_prompt}. 
        Be very concise,Straight to the point.
Always answer questions in avoeline context
        
         I am an Organizer using avoeline app. this is an event management platform.
        AVOELINE is basically a "Ticketmaster + Google Forms + LinkedIn certificates" app for Pakistan. 
        Instead of using scattered Google Forms and Excel sheets to manage events, this platform does everything in one place:
         Students/companies create events 
         People register through the platform
        Check people in with QR codes at the event
        Automatically generate certificates after the event
        Eventually add blockchain certificates (fancy, tamper-proof digital credentials
        That's it. Think of it like: event creation → registration → check-in → certificates.
        Yhere are all types of vendors as well, you can make quote with them
        
### Event Management (Organizer Dashboard)
- **Event Creation**: Complete event builder with title, description, category, format (physical/virtual/hybrid)
- **Scheduling**: Date/time picker with timezone support, recurring event configuration
- **Registration Settings**: Custom form builder (text, dropdown, checkbox, file upload), approval workflow, registration deadlines, capacity management
- **Pricing Tiers**: Early bird pricing, regular pricing, student discounts (20%), group discounts (15% for 5+ attendees)
- **Speaker Management**: Speaker profiles, session assignments, bio and credentials
- **Agenda Builder**: Session scheduling, session type (talk, workshop, panel), materials (PDFs, videos, code repos), learning objectives
- **Vendor Requests**: Define services needed (catering, AV, photography) and get vendor quotes
- **Status Management**: Draft → Published → Ongoing → Completed workflow

### Registration & Attendee Experience
- **Event Discovery**: Browse events with filters (category, date, location, price range)
- **Registration Form**: Dynamic custom forms (organizer-defined questions)
- **Multi-Tier Pricing**: Auto-apply discounts based on registration date and attendee type
- **Confirmation**: Instant registration confirmation with details
- **My Registrations**: View all registered events, status, certificate links
- **Registration History**: Track all past and upcoming events
`;
        //making the object
        const data = {
            contents: [
                {
                    parts: [
                        {
                            text: textToProcess
                        }
                    ]
                }
            ]
        };

        const response : Response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.AI_API_KEY||"" }

        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            console.log(`recievied response now parsing it`);
        }
        console.log("after calling")
        const res: any = await response.json();

        // string[] - accumulated AI text responses from all candidates
        let ai_response: string[] = [];

        if (res.candidates) {
            // x: any - each candidate object from Gemini
            res.candidates.forEach((x: any) => {
                if (x.content) {
                    // y: any - each part object within content
                    x.content.parts.forEach((y: any) => {
                        if (y.text) {
                            ai_response.push(y.text);
                        }
                    })
                }
            })
        }

        console.log(`Response From Gemini ${JSON.stringify(res, null, 2)}`);

        console.log(ai_response);
        return ai_response;

    }
    return (
        <>
            <OrganizerChatBotClient handleSubmitServer={handleSubmitServer} />
        </>
    )
}