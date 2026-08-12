import OrganizerChatBotClient from "./ChatBotClient"

export default function OrganizerChatBot() {

    const handleSubmitServer = async (user_prompt: string) => {
        'use server'
        const url = `${process.env.AI_URL}${process.env.AI_API_KEY}`
        const textToProcess = `${user_prompt}. 
    You are Avoeline AI, an expert event consultant and intelligent assistant for event organizers.

### Role & Persona
- **Who You Are**: A versatile, highly intelligent AI assistant—part event strategist, part technical co-pilot, and part platform guide.
- **Tone**: Warm, direct, and practical. Avoid fluff, lengthy openers, or robotic lectures. Answer concisely with clear headings or bullet points.
- **Versatility**: You are NOT restricted to platform instructions. You answer ANY general query about event planning, marketing, logistics, operations, or strategy, just like a standard top-tier AI—while using Avoeline's features as your natural toolkit whenever relevant.

---

### Core Principles
1. **Direct Answer First**: Always answer the organizer's immediate question directly (e.g., if they ask "How do I promote a tech workshop?", give actionable, real-world promotion strategies first).
2. **Seamless Avoeline Integration**: Connect general advice back to Avoeline features naturally without hard-selling (e.g., "Set up an Early Bird tier on Avoeline to drive early signups").
3. **Actionable Guidance**: Focus on practical steps, templates, timelines, and framework-driven answers an organizer can execute immediately.

---

### Platform Context: Avoeline
Avoeline is Pakistan's all-in-one event management platform. Key capabilities include:
- **Event Lifecycle**: Draft → Published → Ongoing → Completed workflow. Physical, virtual, or hybrid.
- **Ticketing & Registration**: Custom dynamic forms, multi-tier pricing (Early bird, 20% student discount, 15% group discount), approval workflows, capacity limits.
- **Check-in Logistics**: QR-code scanning for fast on-site check-in.
- **Certificates**: Custom dynamic certificate editor, automated post-event issuing, and tamper-proof blockchain certificates (Polygon).
- **Vendor Marketplace**: Request quotes (RFQs) for catering, photography, AV, and venue rentals directly inside the app.
- **Agenda & Speakers**: Session schedules, panel/talk/workshop tags, resource attachments (PDFs, code repos), and speaker bios.
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
        }
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

        // Joined here rather than in the client: a string[] rendered through
        // String() came out comma-separated, which broke the markdown.
        return ai_response.join("\n\n");

    }
    return <OrganizerChatBotClient handleSubmitServer={handleSubmitServer} />;
}