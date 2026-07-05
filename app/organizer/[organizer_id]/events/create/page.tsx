import EventWizardLayout from '@/src/features/events/components/wizard/EventWizardLayout'
import { EventService } from '@/src/services/event.service'
import { EventFormData } from '@/src/services/models/event.model'



export default async function EventWiz({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
    const resolvedParams = await params;
    const organizer_id = resolvedParams.organizer_id;


    const handle_submission = async (formData: EventFormData) => {
        'use server'
        await EventService.create_event(formData, organizer_id);
        console.log("Event created - in eventwix component frontend");

    }
    return (
        <>
            <h1>hi frim page.tsx</h1>
            <EventWizardLayout handle_submission={handle_submission}></EventWizardLayout>
        </>
    )
}