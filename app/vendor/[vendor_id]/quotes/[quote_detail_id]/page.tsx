import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import Link from "next/link";
import { formatDate, formatTime, formatDateTime, parseScheduleDateTime, timeAgo } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { Clock, FileText, PenLine, SearchX } from "lucide-react";

// --- Helper Functions ---
const getDaysRemaining = (validityDate: string="") => {
    if (!validityDate) return null;
    // validity is stored DD/MM/YYYY (or legacy ISO) — new Date() can't parse
    // DD/MM, so use the shared parser.
    const validity = parseScheduleDateTime(validityDate, "");
    if (!validity) return null;
    const now = new Date();
    const diffMs = validity.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', urgent: true };
    if (diffDays === 0) return { label: 'Deadline: today', urgent: true };
    if (diffDays === 1) return { label: 'Deadline: tomorrow', urgent: true };
    return { label: `${diffDays} days remaining`, urgent: false };
};

/** Section heading. Uncarded: a rule and a label group as well as a box did. */
function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h3 className="mb-3 border-b border-line pb-2 text-2xs font-medium uppercase text-ink-soft">{children}</h3>;
}

export default async function QuoteDetailPage({
    params
}: {
    params: Promise<{ vendor_id: string; quote_detail_id: string }>
}) {
    const { vendor_id, quote_detail_id } = await params;

    const booking = await BookingServices.getBookingById(quote_detail_id);

    if (!booking) {
        return (
            <div className="px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <EmptyState
                        icon={<SearchX size={26} />}
                        title="Quote not found"
                        description="This request may have been withdrawn, or the link may be out of date."
                        action={
                            <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("primary")}>
                                Back to quotes
                            </Link>
                        }
                    />
                </div>
            </div>
        );
    }

    let event = null;
    try {
        event = await EventService.getEventByID(booking.eventId);
    } catch {
        // Event not found
    }

    // The organizer's name, email and phone used to be three hardcoded strings
    // ("Dr. Sarah Khan", s.khan@techverse.io, (555) 123-4567) shown for org_001
    // and presented as this booking's real contact. Read the organizer instead.
    let organizer = null;
    try {
        organizer = await OrganizerService.getOrganizerById(booking.organizerId);
    } catch {
        // Organizer not found — the neutral fallbacks below apply.
    }

    // Extract booking data with fallbacks
    const b = booking;
    const requirements = b?.requirements;
    const quote = b?.quote;
    const vendorQuote = quote?.vendorQuote;
    const negotiation = quote?.negotiation || [];
    const payment = b?.payment;
    const delivery = b?.delivery;
    const qualityCheck = b?.qualityCheck;
    const communications = b?.communications || [];
    const documents = b?.documents;

    const eventTitle = event?.title || b?.eventId || "Unknown event";
    const eventDate = requirements?.serviceDate || event?.schedule?.startDate;
    // mapToOrganizer answers a missing document with a placeholder named "unknown"
    // rather than null, so an absent organizer would render as the literal word.
    const rawOrganizerName = organizer?.organization?.name;
    const organizerName = rawOrganizerName && rawOrganizerName !== "unknown" ? rawOrganizerName : "Organizer";
    const organizerEmail = organizer?.contact?.primaryEmail?.replace("unknown@gmail.com", "") || "";
    const organizerPhone = organizer?.contact?.primaryPhone || "";

    const deadline = getDaysRemaining(vendorQuote?.validity || "");

    // `totalAmount || 0 > 0 && (...)` parsed as `totalAmount || ((0 > 0) && card)`,
    // so a priced quote rendered the bare number "45000" and never rendered this
    // card at all. Same shape, same fix, on the discount line below.
    const quotedTotal = vendorQuote?.totalAmount ?? 0;
    const quotedDiscount = vendorQuote?.discount ?? 0;

    const documentLinks = [
        { label: "Quote PDF", url: documents?.quotePdf },
        { label: "Invoice PDF", url: documents?.invoicePdf },
        { label: "Receipt PDF", url: documents?.receiptPdf },
    ].filter((d) => Boolean(d.url));

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
                <PageHeader
                    title={eventTitle}
                    description={`Request ${b?.bookingId} • Event date ${formatDate(eventDate || "")}`}
                    actions={
                        <>
                            <StatusBadge status={b?.status} />
                            {/* The "Decline" button beside this was a bare <button> with no
                                onClick, no form and no action: a vendor could click it,
                                see nothing happen, and believe they had declined. */}
                            <Link
                                href={`/vendor/${vendor_id}/quotes/prep-quote/${quote_detail_id}`}
                                className={buttonClass("primary")}
                            >
                                <PenLine size={16} />
                                Prepare quote
                            </Link>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">

                    {/* Left: Full Requirements */}
                    <div className="space-y-8">
                        <section>
                            <SectionHeading>Full requirements</SectionHeading>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                                {requirements?.description || "No description provided."}
                            </p>
                        </section>

                        {requirements?.specialInstructions && (
                            <section>
                                <SectionHeading>Special instructions</SectionHeading>
                                <p className="text-sm leading-relaxed text-ink-soft">
                                    {requirements.specialInstructions}
                                </p>
                            </section>
                        )}

                        <section>
                            <SectionHeading>Service details</SectionHeading>
                            <dl className="divide-y divide-line">
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Service type</dt>
                                    <dd className="text-sm font-medium capitalize text-ink">{b?.serviceType || 'Not specified'}</dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Service date</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">{formatDate(requirements?.serviceDate)}</dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Time</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">
                                        {formatTime(requirements?.startTime)} – {formatTime(requirements?.endTime)}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Location</dt>
                                    <dd className="text-sm font-medium text-ink">{requirements?.location || 'TBD'}</dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Guest count</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">{requirements?.guestCount || 0}</dd>
                                </div>
                            </dl>
                        </section>

                        {negotiation.length > 0 && (
                            <section>
                                <SectionHeading>Negotiation history</SectionHeading>
                                <ul className="space-y-4">
                                    {negotiation.map((n: any, i: number) => (
                                        <li key={i} className="flex gap-3">
                                            {/* Decoration: the label below names the speaker. */}
                                            <span
                                                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n?.from === 'organizer' ? 'bg-muted-strong' : 'bg-ink'}`}
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <p className="text-xs font-medium text-ink">{n?.from === 'organizer' ? organizerName : 'You (vendor)'}</p>
                                                <p className="mt-1 text-sm text-ink-soft">{n?.message}</p>
                                                <p className="mt-1 text-2xs text-ink-soft tabular-nums">{timeAgo(n?.timestamp)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {communications.length > 0 && (
                            <section>
                                <SectionHeading>Communications</SectionHeading>
                                <ul className="space-y-4">
                                    {communications.map((comm: any, i: number) => (
                                        <li key={i} className="flex gap-3">
                                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-muted-strong" aria-hidden="true" />
                                            <div>
                                                <p className="text-xs font-medium capitalize text-ink">{comm?.from} → {comm?.to}</p>
                                                <p className="mt-1 text-sm text-ink-soft">{comm?.message}</p>
                                                <p className="mt-1 text-2xs text-ink-soft tabular-nums">{timeAgo(comm?.timestamp)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Right: Contact, quote, payment, delivery */}
                    <div className="space-y-8">

                        <section>
                            <SectionHeading>Contact</SectionHeading>
                            <p className="text-sm font-medium text-ink">{organizerName}</p>
                            {organizerEmail || organizerPhone ? (
                                <p className="mt-1 text-sm text-ink-soft">
                                    {[organizerEmail, organizerPhone].filter(Boolean).join(' • ')}
                                </p>
                            ) : (
                                <p className="mt-1 text-sm text-ink-soft">No contact details on file.</p>
                            )}
                            {/* Was a "Contact" button that did nothing. A mailto does, and
                                only appears when there is an address to send to. */}
                            {organizerEmail && (
                                <a href={`mailto:${organizerEmail}`} className={buttonClass("secondary", "sm", "mt-3")}>
                                    Email organizer
                                </a>
                            )}
                        </section>

                        {quotedTotal > 0 && (
                            <section>
                                <SectionHeading>Current quote</SectionHeading>
                                <dl className="divide-y divide-line">
                                    <div className="flex justify-between gap-3 py-2.5">
                                        <dt className="text-sm text-ink-soft">Base price</dt>
                                        <dd className="text-sm font-medium text-ink tabular-nums">{formatCurrency(vendorQuote?.basePrice || 0)}</dd>
                                    </div>

                                    {vendorQuote?.additionalCharges?.map((charge: any, i: number) => (
                                        <div key={i} className="flex justify-between gap-3 py-2.5">
                                            <dt className="text-sm text-ink-soft">{charge?.description}</dt>
                                            <dd className="text-sm font-medium text-ink tabular-nums">+{formatCurrency(charge?.amount)}</dd>
                                        </div>
                                    ))}

                                    {quotedDiscount > 0 && (
                                        <div className="flex justify-between gap-3 py-2.5">
                                            <dt className="text-sm text-ink-soft">Discount</dt>
                                            <dd className="text-sm font-medium text-ink tabular-nums">−{formatCurrency(quotedDiscount)}</dd>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-3 py-3">
                                        <dt className="text-sm font-medium text-ink">Total amount</dt>
                                        <dd className="font-display text-xl text-ink tabular-nums">{formatCurrency(quotedTotal)}</dd>
                                    </div>
                                </dl>

                                {vendorQuote?.terms && (
                                    <p className="mt-3 text-xs text-ink-soft">{vendorQuote.terms}</p>
                                )}
                            </section>
                        )}

                        {payment?.paymentSchedule && payment.paymentSchedule.length > 0 && (
                            <section>
                                <SectionHeading>Payment schedule</SectionHeading>
                                <ul className="divide-y divide-line">
                                    {payment.paymentSchedule.map((inst: any, i: number) => (
                                        <li key={i} className="flex items-center justify-between gap-2 py-3">
                                            <span className="text-sm text-ink">{inst?.installment}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-ink tabular-nums">{formatCurrency(inst?.amount)}</span>
                                                <StatusBadge status={inst?.status || 'pending'} size="sm" />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {delivery?.scheduledDate && (
                            <section>
                                <SectionHeading>Delivery</SectionHeading>
                                <dl className="divide-y divide-line">
                                    <div className="flex justify-between gap-3 py-2.5">
                                        <dt className="text-sm text-ink-soft">Scheduled</dt>
                                        <dd className="text-sm font-medium text-ink tabular-nums">
                                            {formatDate(delivery?.scheduledDate)} at {formatTime(delivery?.scheduledTime)}
                                        </dd>
                                    </div>
                                    {delivery?.actualDeliveryTime && (
                                        <div className="flex justify-between gap-3 py-2.5">
                                            <dt className="text-sm text-ink-soft">Actual</dt>
                                            <dd className="text-sm font-medium text-ink tabular-nums">{formatTime(delivery.actualDeliveryTime)}</dd>
                                        </div>
                                    )}
                                </dl>
                                {delivery?.deliveryNotes && (
                                    <p className="mt-3 text-xs text-ink-soft">{delivery.deliveryNotes}</p>
                                )}
                            </section>
                        )}

                        {qualityCheck?.organizerCheck?.checked && (
                            <section>
                                <SectionHeading>Quality review</SectionHeading>
                                <div className="flex items-center gap-2">
                                    <StarRating rating={qualityCheck.organizerCheck?.rating || 0} />
                                    <span className="text-sm font-medium text-ink tabular-nums">{qualityCheck.organizerCheck?.rating}/5</span>
                                </div>
                                {qualityCheck.organizerCheck?.comments && (
                                    <p className="mt-2 text-sm text-ink-soft">{qualityCheck.organizerCheck.comments}</p>
                                )}
                            </section>
                        )}

                        {/* Was a two-item hardcoded array — "Floor_Plan.pdf, 2.4 MB" and
                            "Menu_Requirements.docx, 1.1 MB" — shown as this request's
                            attachments on every booking. Only real documents now. */}
                        {documentLinks.length > 0 && (
                            <section>
                                <SectionHeading>Documents</SectionHeading>
                                <ul className="divide-y divide-line">
                                    {documentLinks.map((doc) => (
                                        <li key={doc.label}>
                                            <a
                                                href={doc.url as string}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 py-3 text-sm text-ink hover:underline"
                                            >
                                                <FileText size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                                {doc.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                </div>

                <div className="mt-10 flex items-center gap-2 border-t border-line pt-6">
                    <Clock size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                    {deadline ? (
                        <span className={`text-sm ${deadline.urgent ? 'font-medium text-ink' : 'text-ink-soft'}`}>
                            {deadline.label}
                        </span>
                    ) : (
                        <span className="text-sm text-ink-soft">No deadline set</span>
                    )}
                </div>

                {b?.statusHistory && b.statusHistory.length > 0 && (
                    <section className="mt-10">
                        <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Status history</h2>
                        <ul className="divide-y divide-line">
                            {b.statusHistory.map((s: any, index: number) => (
                                <li key={index} className="flex items-center justify-between gap-3 py-3">
                                    <span className="text-sm font-medium capitalize text-ink">{s?.status?.replace(/_/g, ' ')}</span>
                                    <span className="text-xs text-ink-soft tabular-nums">{formatDateTime(s?.timestamp)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
