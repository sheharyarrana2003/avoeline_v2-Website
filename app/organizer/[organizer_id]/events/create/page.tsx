import EventWizardLayout from '@/src/features/events/components/wizard/EventWizardLayout'
import { EventService } from '@/src/services/event.service'
import { EventFormData } from '@/src/services/models/event.model'
import { listTaxonomy } from '@/src/features/taxonomy/taxonomy.service';
import { selectable } from '@/src/features/taxonomy/types';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';



export default async function EventWiz({ params }: { params: Promise<{ organizer_id: string }> }) {
    const resolvedParams = await params;
    const organizer_id = resolvedParams.organizer_id;

    // Only the live vocabulary crosses to the client. A deactivated or still
    // pending entry must not be pickable, and create_event re-checks the same
    // predicate on the way back in.
    const taxonomy = await listTaxonomy();
    const entries = [...selectable(taxonomy, 'super'), ...selectable(taxonomy, 'format')];


    const handle_submission = async (formData: EventFormData) => {
        'use server'
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
            <EventWizardLayout handle_submission={handle_submission} entries={entries} ></EventWizardLayout>
        </>
    )
}