import EventWizardLayout from '@/src/features/events/components/wizard/EventWizardLayout'
import { EventService } from '@/src/services/event.service'
import { EventFormData } from '@/src/services/models/event.model'
import { redirect } from 'next/navigation';



export default async function EventWiz({ params }: { params: Promise<{ organizer_id: string }> }) {
    const resolvedParams = await params;
    const organizer_id = resolvedParams.organizer_id;


    const handle_submission = async (formData: EventFormData) => {
        'use server'
        const new_id = await EventService.create_event(formData, organizer_id);
        console.log("Event created - in eventwix component frontend");

        redirect(`/organizer/${organizer_id}/events/${new_id}/pub-succ`)

    }
    return (
        <>
            <EventWizardLayout handle_submission={handle_submission}></EventWizardLayout>
        </>
    )
}