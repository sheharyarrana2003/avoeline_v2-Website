import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData, Quote, VendorQuote } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { NotificationServices } from "@/src/services/notification.services";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AcceptQuoteButton } from "@/src/features/bookings/components/AcceptQuoteButton";
import { ok, fail, type ActionResult } from "@/src/lib/action";
import { VendorData } from "@/src/services/models/vendor.model";
import { formatDate, timeAgo } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { ArrowLeftRight, ChevronRight, FileText, Inbox, Store } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";

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

    // Recipient read back from Firestore, not taken from the `booking` argument:
    // that argument arrives from a Client Component (see Acceptbutton.tsx), so its
    // vendorId is caller-controlled and would let anyone address an arbitrary
    // vendor's inbox.
    // ponytail: this action still has no ownership check at all — a pre-existing
    // gap, tracked separately. Whoever adds one should authorize on the re-read
    // doc and drop the client-supplied booking entirely.
    const fresh = await BookingServices.getBookingById(booking.bookingId);
    if (fresh) {
        await NotificationServices.createNotification({
            userId: fresh.vendorId,
            type: "booking_confirmation",
            title: "Quote accepted",
            message: "The organizer accepted your quote.",
            deepLink: `/vendor/${fresh.vendorId}/quotes/${fresh.bookingId}`,
        });
    }

    // Without these the write lands but nothing on screen changes, so accepting a
    // quote looks like it did nothing. Refresh the organizer's own list, and the
    // vendor's views under "layout" scope so their header unread badge picks up
    // the notification just written above.
    const target = fresh ?? booking;
    revalidatePath(`/organizer/${target.organizerId}/quotes`);
    revalidatePath(`/vendor/${target.vendorId}`, "layout");
    return ok();
    } catch (err) {
        console.error("[accept_quote:organizer]", err);
        return fail("Could not accept the quote. Please try again.");
    }
}


export default async function QuoteManagementPage({
    params,
    searchParams
}: {
    params: Promise<{ organizer_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { organizer_id } = await params;
    const awaitedSearchParams = await searchParams;

    // Get active tab from URL (active or past)
    const activeTab = (awaitedSearchParams?.tab as string) || "active";
    const raw_bookings = await BookingServices.getAllBookingsOfOrganizer(organizer_id) || [];
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
    const selectedQuote = displayQuotes.find((b: any) => b?.bookingId === selectedQuoteId) || null;

    // Fetch vendor data for selected quote
    let selectedVendor: VendorData | null = null;
    if (selectedQuote?.vendorId) {
        try {
            selectedVendor = await EventVendorService.getVendorById(selectedQuote.vendorId);
        } catch {
            selectedVendor = null;
        }
    }

    // Everything in the list except the one on screen, so the picker still works
    // on the Past tab and when nothing is selected yet.
    const otherQuotes = displayQuotes.filter((b: any) => b?.bookingId !== selectedQuote?.bookingId);

    const tabs = [
        { label: "Active Quotes", value: "active", count: activeQuotes.length },
        { label: "Past Quotes", value: "past", count: pastQuotes.length },
    ];

    // A missing vendor document no longer blanks the whole card -- the quote is the
    // thing being reviewed, and the vendor id stands in for a name we cannot read.
    const renderSelectedQuote = (booking: BookingData) => {
        const businessName = selectedVendor?.businessName || booking.vendorId || "Unknown Vendor";

        const quote: Quote = booking.quote;
        const vendorQuote: VendorQuote | null = quote?.vendorQuote;
        const breakdown = vendorQuote?.breakdown || [];
        const totalAmount = vendorQuote?.totalAmount || 0;
        const currency = booking.payment?.currency || "PKR";
        const validity = quote?.vendorQuote?.validity || "";
        const submittedAt = quote?.respondedAt || quote?.requestedAt || "";
        const terms = vendorQuote?.terms || "";
        const negotiations = quote?.negotiation || [];

        return (
            <section className="rounded-2xl border border-line bg-paper p-6 md:p-8">

                <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-muted">
                            <Store size={20} className="text-ink-soft" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="font-display text-xl text-ink">{businessName}</h2>
                            <p className="mt-0.5 text-sm text-ink-soft">
                                Submitted {timeAgo(submittedAt)} • Proposal #{booking.bookingId}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-semibold text-ink tabular-nums">{formatCurrency(totalAmount, currency)}</p>
                        <p className="mt-1 text-sm text-ink-soft tabular-nums">
                            Valid until {validity ? formatDate(validity) : "—"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                    {/* Itemized Pricing */}
                    <div>
                        <h3 className="mb-4 border-b border-line pb-2 text-2xs font-medium uppercase text-ink-soft">
                            Itemized Pricing
                        </h3>
                        {breakdown.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<FileText size={24} />}
                                title="No breakdown provided"
                                description="This vendor quoted a single total. Send a counter offer to ask them to itemise it."
                            />
                        ) : (
                            <div className="space-y-1">
                                {breakdown.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-2">
                                        <span className="text-sm text-ink-soft">{item?.item || "Item"}</span>
                                        <span className="text-sm font-medium text-ink tabular-nums">
                                            {formatCurrency(item?.total || 0, currency)}
                                        </span>
                                    </div>
                                ))}
                                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                                    <span className="text-sm font-medium text-ink">Total Amount</span>
                                    <span className="text-xl font-semibold text-ink tabular-nums">
                                        {formatCurrency(totalAmount, currency)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Negotiation History */}
                    <div>
                        <h3 className="mb-4 border-b border-line pb-2 text-2xs font-medium uppercase text-ink-soft">
                            Negotiation History
                        </h3>
                        {negotiations.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<ArrowLeftRight size={24} />}
                                title="Nothing negotiated yet"
                                description="Send a counter offer and the exchange will be recorded here."
                            />
                        ) : (
                            <ul className="space-y-5">
                                {negotiations.map((n: any, i: number) => {
                                    const isOrganizer = n?.from === "organizer";
                                    return (
                                        <li key={i} className="flex gap-3">
                                            {/* Decoration only — the name beside it says who spoke. */}
                                            <span
                                                aria-hidden="true"
                                                className={`mt-2 size-2 shrink-0 rounded-full ${isOrganizer ? "bg-ink" : "bg-muted-strong"}`}
                                            />
                                            <div>
                                                <p className="text-xs font-medium text-ink">
                                                    {isOrganizer ? "You (Organizer)" : businessName}
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                                                    {n?.message || "No message"}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {terms ? (
                            <div className="mt-6 border-t border-line pt-6">
                                <h3 className="mb-3 text-2xs font-medium uppercase text-ink-soft">
                                    Terms &amp; Conditions
                                </h3>
                                <p className="text-xs leading-relaxed text-ink-soft">{terms}</p>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
                    <Link
                        href={`/organizer/${organizer_id}/booking-details/${booking.bookingId}/counter-offer`}
                        className={buttonClass("secondary")}
                    >
                        <ArrowLeftRight size={16} aria-hidden="true" />
                        Counter Offer
                    </Link>
                    <div className="sm:ml-auto">
                        <AcceptQuoteButton quote={sanitizeForClient(booking)} accept_quote={accept_quote} />
                    </div>
                </div>
            </section>
        );
    };

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">

                <PageHeader title="Quote Management" description="Review vendor quotes" />

                <nav className="mb-6 flex gap-8 border-b border-line" aria-label="Quote filters">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.value;
                        return (
                            <Link
                                key={tab.value}
                                href={`?tab=${tab.value}`}
                                className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition ${isActive
                                    ? "border-ink text-ink"
                                    : "border-transparent text-ink-soft hover:text-ink"
                                    }`}
                            >
                                {tab.label} <span className="tabular-nums">({tab.count})</span>
                            </Link>
                        );
                    })}
                </nav>

                {displayQuotes.length === 0 ? (
                    <EmptyState
                        icon={<Inbox size={28} />}
                        title={activeTab === "active" ? "No quotes in flight" : "No past quotes"}
                        description={
                            activeTab === "active"
                                ? "Request a quote from a provider and their response will land here."
                                : "Completed and cancelled bookings are archived here once they close."
                        }
                        action={
                            activeTab === "active" ? (
                                <Link href={`/organizer/${organizer_id}/vendor-marketplace`} className={buttonClass()}>
                                    Browse providers
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="space-y-8">
                        {selectedQuote ? (
                            renderSelectedQuote(selectedQuote)
                        ) : (
                            <EmptyState
                                icon={<FileText size={28} />}
                                title="Pick a quote to review"
                                description="Choose one of the quotes below to see its pricing, terms and negotiation history."
                            />
                        )}

                        {otherQuotes.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="border-b border-line pb-2 text-2xs font-medium uppercase text-ink-soft">
                                    {selectedQuote ? "Other Quotes" : "Quotes"}
                                </h2>
                                {otherQuotes.map((booking: any, i: number) => {
                                    const bq = booking?.quote?.vendorQuote || {};
                                    return (
                                        <Link
                                            key={booking?.bookingId || i}
                                            href={`?tab=${activeTab}&quote=${booking?.bookingId}`}
                                            className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 transition hover:border-line-loud"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-muted">
                                                    <Store size={16} className="text-ink-soft" aria-hidden="true" />
                                                </span>
                                                <span>
                                                    <span className="block text-sm font-medium text-ink">
                                                        Vendor {booking?.vendorId}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-ink-soft tabular-nums">
                                                        {formatCurrency(bq?.totalAmount, booking?.payment?.currency || "PKR")}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-3">
                                                {/* Real status, where the row used to claim "Pending response" for every quote. */}
                                                <StatusBadge status={booking?.status} size="sm" />
                                                <ChevronRight size={16} className="text-ink-faint" aria-hidden="true" />
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
