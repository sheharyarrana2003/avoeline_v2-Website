import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { SubmitButton } from "@/src/shared_components/SubmitButton";


export default async function ReqQuotePage({
    params}: {
    params: Promise<{ id: string, organizer_id: string, vendor_id: string }>;
}) {
    const { organizer_id } = await params;
    const { vendor_id } = await params;

    const handle_submission = async (organizerId: string, vendorId: string = '', form_data: FormData) => {
        'use server'
        console.log(`this is the form data , ${form_data}`);
        const eventId = form_data.get("selectedEventId") as string;
        await BookingServices.createBookingFromForm(form_data, organizerId, eventId, vendorId);

    }

    const all_events_of_organizer  : EventModel[]= await EventService.getAllEventsByOrganizer(organizer_id);
    const activeEvents : EventModel[]= all_events_of_organizer.filter(x => 
    ['published', 'registration_open', 'ongoing'].includes(x.status))

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Quote Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Post requirements and review vendor quotes</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ================= LEFT COLUMN: Quote Request Form ================= */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 className="font-bold text-gray-900">New Quote Request</h2>
                            </div>

                            <form className="space-y-5" action={handle_submission.bind(null, organizer_id, vendor_id)}>
                                {/* {Events} */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Event</label>
                                    <div className="relative">
                                        <select name="selectedEventId" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 appearance-none outline-none">
                                            {activeEvents.map((event) => (
                                                /* 2. Set the value to the event ID, but display the name */
                                                <option key={event.id} value={event.id}>
                                                    {event.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category</label>
                                    <div className="relative">
                                        {/* Added name="serviceType" */}
                                        <select name="serviceType" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-gray-200">
                                            <option>Catering Services</option>
                                            <option>Venues</option>
                                            <option>Photography</option>
                                            <option>Decor</option>
                                            <option>Music</option>
                                            <option>Events</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Service Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Service Name</label>
                                    {/* Added name="serviceName" */}
                                    <input
                                        name="serviceName"
                                        type="text"
                                        placeholder="e.g Premium Lunch Buffet"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>

                                {/* Requirements */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Requirements</label>
                                    {/* Added name="requirementsDescription" */}
                                    <textarea
                                        name="requirementsDescription"
                                        placeholder="Describe your specific needs..."
                                        rows={4}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                                    />
                                </div>

                                {/* Event Date & Setup Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Event Date</label>
                                        {/* Added name="serviceDate" */}
                                        <input
                                            name="serviceDate"
                                            type="date"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Setup Time</label>
                                        {/* Added name="startTime" */}
                                        <input
                                            name="startTime"
                                            type="time"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>
                                </div>

                                {/* Toggle */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Send to all eligible vendors</span>
                                    <button type="button" className="relative w-11 h-6 bg-black rounded-full transition-colors">
                                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform" />
                                    </button>
                                </div>

                                {/* Submit */}
                                <SubmitButton
                                    pendingText="Submitting…"
                                    className="w-full bg-black text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Submit Quote Request
                                </SubmitButton>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}