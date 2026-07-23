import EventWizardLayout from '@/src/features/events/components/wizard/EventWizardLayout'
import { EventService } from '@/src/services/event.service'
import { EventFormData } from '@/src/services/models/event.model'
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';



export default async function EventWiz({ params }: { params: Promise<{ organizer_id: string }> }) {
    const resolvedParams = await params;
    const organizer_id = resolvedParams.organizer_id;


    const handle_submission = async (formData: EventFormData) => {
        try {
            const new_id = await EventService.create_event(formData, organizer_id);
            console.log("Event created successfully");

            // ONLY triggers if create_event succeeded
            redirect(`/organizer/${organizer_id}/events/${new_id}/pub-succ`);
        } catch (error) {
            // Re-throw Next.js internal redirect error so navigation works on success
            if (isRedirectError(error)) {
                throw error;
            }

            console.error("Event creation failed:", error);

            // Returning this keeps the user on the current page and sends back the error
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create event. Please try again.'
            };
        }
    }
    return (
        <>
            <EventWizardLayout handle_submission={handle_submission} ></EventWizardLayout>
        </>
    )
}