import EventWizardLayout from '@/src/features/events/components/wizard/EventWizardLayout'
import { EventService } from '@/src/services/event.service'
import { EventFormData } from '@/src/services/models/event.model'
import { CategoryEngineService } from '@/src/features/taxonomy/categoryEngine.service';
import { listTaxonomy } from '@/src/features/taxonomy/taxonomy.service';
import { selectable } from '@/src/features/taxonomy/types';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { AuthService } from '@/src/features/auth/authService';
import { hasModuleAccess } from '@/src/features/permissions/permissions.service';

export const dynamic = "force-dynamic";

export default async function EventWiz({
    params,
    searchParams,
}: {
    params: Promise<{ organizer_id: string }>;
    searchParams?: Promise<{ hackathon?: string }>;
}) {
    const resolvedParams = await params;
    const organizer_id = resolvedParams.organizer_id;
    const sp = searchParams ? await searchParams : {};
    const user = await AuthService.getCurrentUser().catch(() => null);
    const canHackathon = user ? await hasModuleAccess(user.userId, "hackathon_ops") : false;
    const initialIsHackathon = sp.hackathon === "1" && canHackathon;

    // Fetch active categories, formats, fieldsets, and taxonomy
    const [superCategories, eventFormats, fieldSets, taxonomy] = await Promise.all([
        CategoryEngineService.getActiveSuperCategories(),
        CategoryEngineService.getActiveEventFormats(),
        CategoryEngineService.getAllFieldSets(),
        listTaxonomy(),
    ]);

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
                error: error instanceof Error
                    ? error.message
                    : typeof error === "object" && error && "message" in error
                      ? String((error as { message: unknown }).message)
                      : "Failed to create event. Please try again.",
            };
        }
    }

    return (
        <EventWizardLayout
            handle_submission={handle_submission}
            entries={entries}
            superCategories={superCategories}
            eventFormats={eventFormats}
            fieldSets={fieldSets}
            initialIsHackathon={initialIsHackathon}
            canHackathon={canHackathon}
        />
    );
}