import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { DateField } from "@/src/shared_components/DateField";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";


export default async function ReqQuotePage({
    params }: {
        params: Promise<{ organizer_id: string, vendor_id: string }>;
    }) {
    const { organizer_id, vendor_id } = await params;

    const handle_submission = async (organizerId: string, vendorId: string = '', form_data: FormData) => {
        'use server'
        const eventId = form_data.get("selectedEventId") as string;

        try {
            await BookingServices.createBookingFromForm(form_data, organizerId, eventId, vendorId);
            redirect(`/organizer/${organizer_id}/quotes`)
        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }

            console.error("booking creation failed:", error);
        }
    }

    const [vendor, all_events_of_organizer] = await Promise.all([
        EventVendorService.getVendorById(vendor_id),
        EventService.getAllEventsByOrganizer(organizer_id)
    ])

    const activeEvents: EventModel[] = all_events_of_organizer.filter(x =>
        ['published', 'registration_open', 'ongoing'].includes(x.status))

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Was titled "Quote Management" -- the exact title of the quotes list page,
                on a form that asks one vendor for one quote. */}
            <PageHeader
                title="Request a quote"
                description={`Tell ${vendor?.businessName ?? "this vendor"} what you need and they will price it.`}
            />

            {activeEvents.length === 0 ? (
                // The select used to render zero options here, so the form posted an
                // empty eventId and created a booking attached to no event at all.
                <EmptyState
                    icon={<CalendarPlus className="h-5 w-5" />}
                    title="No live events to book against"
                    description="A quote is attached to an event. Publish an event first, then come back and request pricing."
                    action={
                        <Link href={`/organizer/${organizer_id}/events`} className={buttonClass("primary")}>
                            Go to events
                        </Link>
                    }
                />
            ) : (
                <form className="space-y-5" action={handle_submission.bind(null, organizer_id, vendor_id)}>
                    <div>
                        <label className={labelClass} htmlFor="selectedEventId">Event</label>
                        <select id="selectedEventId" name="selectedEventId" className={`${fieldClass} mt-1`}>
                            {activeEvents.map((event) => (
                                /* Value is the event id; the label is what a human reads. */
                                <option key={event.id} value={event.id}>
                                    {event.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="serviceType">Category</label>
                        <select id="serviceType" name="serviceType" className={`${fieldClass} mt-1`}>
                            {vendor?.serviceCategories.map(s => <option key={s} value={s.trim()}>{s.trim()}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="serviceId">Service</label>
                        {/* Value is the service's uuid, label is its name — without an
                            explicit value the option text was submitted, so bookings
                            stored the service NAME in serviceId and couldn't be joined
                            back to vendor.services. */}
                        <select id="serviceId" name="serviceId" className={`${fieldClass} mt-1`}>
                            {vendor?.services.map(s => <option key={s.serviceId} value={s.serviceId}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="requirementsDescription">Requirements</label>
                        <textarea
                            id="requirementsDescription"
                            name="requirementsDescription"
                            placeholder="Describe your specific needs…"
                            rows={4}
                            className={`${fieldClass} mt-1 resize-none`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} htmlFor="serviceDate">Event date</label>
                            <DateField id="serviceDate" name="serviceDate" className={`${fieldClass} mt-1`} />
                        </div>
                        <div>
                            <label className={labelClass} htmlFor="startTime">Setup time</label>
                            <input id="startTime" name="startTime" type="time" className={`${fieldClass} mt-1 tabular-nums`} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="budget">Budget</label>
                        <input id="budget" name="budget" type="number" min="0" className={`${fieldClass} mt-1 tabular-nums`} />
                    </div>

                    <SubmitButton pendingText="Submitting…" className={buttonClass("primary", "lg", "w-full")}>
                        Send request
                    </SubmitButton>
                </form>
            )}
        </div>
    );
}
