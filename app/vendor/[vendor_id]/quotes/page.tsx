import { AcceptQuoteButton } from "@/src/features/bookings/components/AcceptQuoteButton";
import { ok, fail, type ActionResult } from "@/src/lib/action";
import { revalidatePath } from "next/cache";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
import { formatDate, timeAgo } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { statusMeta } from "@/src/lib/status";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { ChevronRight, Eye, FileText, PenLine, Repeat } from "lucide-react";

function sanitizeForClient<T>(obj: T): T {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        // Convert Firestore Timestamps {_seconds, _nanoseconds} to ISO string
        if (value && typeof value === 'object' && '_seconds' in value) {
            return new Date(value._seconds * 1000).toISOString();
        }
        return value;
    }));
}
const accept_quote = async (booking: BookingData): Promise<ActionResult> => {
    'use server'
    try {
        const new_status_history = {
            status: 'quote_accepted',
            timestamp: new Date().toISOString()
        }

        booking?.statusHistory.push(new_status_history);
        booking.status = 'quote_accepted'
        await BookingServices.update_booking(booking);

        // This had no revalidation at all, so the write landed and the page
        // never changed -- indistinguishable from a failure. Re-read rather
        // than trusting the client-supplied booking for the ids, and refresh
        // the organizer under "layout" scope so their side updates too.
        const fresh = await BookingServices.getBookingById(booking.bookingId);
        const target = fresh ?? booking;
        revalidatePath(`/vendor/${target.vendorId}/quotes`);
        revalidatePath(`/organizer/${target.organizerId}`, "layout");
        return ok();
    } catch (err) {
        console.error("[accept_quote:vendor]", err);
        return fail("Could not accept the quote. Please try again.");
    }
}

export default async function VendorQuoteManagementPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string, organizer_id: string, vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    // Get active tab from URL (active or past)
    const activeTab = (awaitedSearchParams?.tab as string) || "active";

    // NOTE: assumes BookingServices exposes a vendor-scoped fetch method,
    // mirroring getAllBookingsOfOrganizer. Adjust the method name if yours differs.
    const raw_bookings = await BookingServices.getAllBookingsOfVendor(vendor_id) || [];

    const activeStatuses = ['quote_requested', 'quote_sent', 'quote_accepted', 'inprogress', 'confirmed'];
    const pastStatuses = ['completed', 'cancelled'];

    const activeQuotes = raw_bookings.filter((b: any) =>
        activeStatuses.includes(b?.status?.toLowerCase())
    );

    const pastQuotes = raw_bookings.filter((b: any) =>
        pastStatuses.includes(b?.status?.toLowerCase())
    );

    const displayQuotes = activeTab === "active" ? activeQuotes : pastQuotes;

    // Get selected quote ID from URL
    const selectedQuoteId = awaitedSearchParams?.quote as string;
    const selectedQuote = displayQuotes.find((b: any) => b?.bookingId === selectedQuoteId) || displayQuotes[0];

    // Fetch event data for the selected quote (the vendor's counterpart is the event/organizer, not another vendor)
    let selectedEvent: any = null;
    if (selectedQuote?.eventId) {
        try {
            selectedEvent = await EventService.getEventByID(selectedQuote.eventId);
        } catch {
            selectedEvent = null;
        }
    }

    const ev = selectedEvent;
    const eventName = ev?.eventName || ev?.name || ev?.title || selectedQuote?.eventId || "Unknown Event";
    const organizerName = ev?.organizerName || selectedQuote?.organizerId || "Unknown Organizer";

    const quote = selectedQuote?.quote;
    const vendorQuote = quote?.vendorQuote;
    const breakdown = vendorQuote?.breakdown || [];
    const totalAmount = vendorQuote?.totalAmount || 0;
    const currency = selectedQuote?.payment?.currency || "PKR";
    const validity = quote?.vendorQuote?.validity || "";
    const proposalNumber = selectedQuote?.bookingId || "N/A";
    const submittedAt = quote?.respondedAt || quote?.requestedAt || "";
    const terms = vendorQuote?.terms || "";

    // Negotiation history
    const negotiations = quote?.negotiation || [];

    const tabs = [
        { id: "active", label: `Active quotes (${activeQuotes.length})` },
        { id: "past", label: `Past quotes (${pastQuotes.length})` },
    ];

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <PageHeader
                    title="Quotes"
                    description="Review incoming requests, price them, and respond."
                />

                <nav aria-label="Filter quotes" className="mb-8 flex gap-6 border-b border-line">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`?tab=${tab.id}`}
                            aria-current={activeTab === tab.id ? "page" : undefined}
                            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? "border-gray-900 text-ink"
                                    : "border-transparent text-ink-soft hover:text-ink"
                            }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>

                {selectedQuote ? (
                    <>
                        <article>
                            {/* Header */}
                            <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-start gap-4">
                                    <span
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft"
                                        aria-hidden="true"
                                    >
                                        <FileText size={18} />
                                    </span>
                                    <div>
                                        <h2 className="font-display text-xl text-ink">{eventName}</h2>
                                        <p className="mt-1 text-sm text-ink-soft">
                                            {organizerName} • Submitted {timeAgo(submittedAt)} • Proposal {proposalNumber}
                                        </p>
                                        <div className="mt-2">
                                            <StatusBadge status={selectedQuote?.status} size="sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="sm:text-right">
                                    <p className="font-display text-2xl text-ink tabular-nums">{formatCurrency(totalAmount, currency)}</p>
                                    {validity && (
                                        <p className="mt-1 text-sm text-ink-soft tabular-nums">Valid until {formatDate(validity)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                                {/* Itemized Pricing */}
                                <section>
                                    <h3 className="mb-4 border-b border-line pb-3 text-2xs font-medium uppercase text-ink-soft">Itemized pricing</h3>
                                    {breakdown.length > 0 ? (
                                        <ul className="divide-y divide-line">
                                            {breakdown.map((item: any, i: number) => (
                                                <li key={i} className="flex items-center justify-between gap-3 py-3">
                                                    <span className="text-sm text-ink-soft">{item?.item || 'Item'}</span>
                                                    <span className="text-sm font-medium text-ink tabular-nums">{formatCurrency(item?.total || 0, currency)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <EmptyState
                                            size="sm"
                                            title="No breakdown yet"
                                            description="Line items appear here once you price this request."
                                        />
                                    )}

                                    <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                                        <span className="text-sm font-medium text-ink">Total amount</span>
                                        <span className="font-display text-xl text-ink tabular-nums">{formatCurrency(totalAmount, currency)}</span>
                                    </div>
                                </section>

                                {/* Negotiation History */}
                                <section>
                                    <h3 className="mb-4 border-b border-line pb-3 text-2xs font-medium uppercase text-ink-soft">Negotiation history</h3>
                                    {negotiations.length > 0 ? (
                                        <ul className="space-y-5">
                                            {negotiations.map((n: any, i: number) => {
                                                const isOrganizer = n?.from === "organizer";
                                                return (
                                                    <li key={i} className="flex gap-3">
                                                        {/* Position, not colour, says who spoke: the label below
                                                            names them, so the dot is pure decoration. */}
                                                        <span
                                                            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${isOrganizer ? 'bg-gray-300' : 'bg-gray-900'}`}
                                                            aria-hidden="true"
                                                        />
                                                        <div>
                                                            <p className="text-xs font-medium text-ink">
                                                                {isOrganizer ? organizerName : "You (vendor)"}
                                                            </p>
                                                            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                                                                {n?.message || "No message"}
                                                            </p>
                                                            <p className="mt-1 text-2xs text-ink-soft tabular-nums">{timeAgo(n?.timestamp)}</p>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <EmptyState
                                            size="sm"
                                            title="Nothing discussed yet"
                                            description="Messages exchanged while agreeing a price show up here."
                                        />
                                    )}

                                    <div className="mt-6 border-t border-line pt-6">
                                        <h4 className="mb-2 text-2xs font-medium uppercase text-ink-soft">Terms &amp; conditions</h4>
                                        <p className="text-sm leading-relaxed text-ink-soft">
                                            {terms || "No terms specified."}
                                        </p>
                                    </div>
                                </section>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row">
                                <Link
                                    href={`/vendor/${vendor_id}/quotes/prep-quote/${selectedQuote.bookingId}`}
                                    className={buttonClass("primary")}
                                >
                                    <PenLine size={16} />
                                    Prepare offer
                                </Link>

                                <Link
                                    href={`/vendor/${vendor_id}/bookings/${selectedQuote.bookingId}/counter-offer`}
                                    className={buttonClass("secondary")}
                                >
                                    <Repeat size={16} />
                                    Counter offer
                                </Link>

                                <Link
                                    href={`/vendor/${vendor_id}/bookings/${selectedQuote.bookingId}`}
                                    className={buttonClass("secondary")}
                                >
                                    <Eye size={16} />
                                    View details
                                </Link>

                                <AcceptQuoteButton quote={sanitizeForClient(selectedQuote)} accept_quote={accept_quote} />
                            </div>
                        </article>

                        {/* Other Quotes */}
                        {displayQuotes.length > 1 && (
                            <section className="mt-12">
                                <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Other requests</h2>
                                <ul className="divide-y divide-line">
                                    {displayQuotes.filter((b: any) => b?.bookingId !== selectedQuote?.bookingId).map((booking: any, i: number) => {
                                        const bq = booking?.quote?.vendorQuote || {};
                                        return (
                                            <li key={booking?.bookingId || i}>
                                                <Link
                                                    href={`?tab=${activeTab}&quote=${booking?.bookingId}`}
                                                    className="flex items-center justify-between gap-3 py-4 transition hover:bg-gray-50"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-ink">Organizer {booking?.organizerId}</p>
                                                        <p className="mt-0.5 text-xs text-ink-soft tabular-nums">
                                                            {formatCurrency(bq?.totalAmount || 0, booking?.payment?.currency || "PKR")} • {statusMeta(booking?.status).label}
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        )}
                    </>
                ) : (
                    <EmptyState
                        icon={<FileText size={26} />}
                        title={activeTab === "active" ? "No active quote requests" : "No past quotes"}
                        description={
                            activeTab === "active"
                                ? "Organizers request quotes from the services on your profile. A fuller catalogue with prices gets you found."
                                : "Completed and cancelled quotes are archived here."
                        }
                        action={
                            activeTab === "active" ? (
                                <Link href={`/vendor/${vendor_id}/services`} className={buttonClass("primary")}>
                                    Manage services
                                </Link>
                            ) : undefined
                        }
                    />
                )}
            </div>
        </div>
    );
}
