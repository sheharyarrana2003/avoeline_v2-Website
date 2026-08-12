import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { Check, FileText, History } from "lucide-react";

/** Section heading. Uncarded: a rule and a label group as well as a box did. */
function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">{children}</h2>;
}

export default async function VendorBookingDetailPage({ params }: { params: Promise<{ vendor_id: string, booking_id: string }> }) {
    const { vendor_id, booking_id } = await params;

    const raw_booking = await BookingServices.getBookingById(booking_id);
    if (!raw_booking) {
        notFound();
    }

    const [organizer, vendor, event] = await Promise.all([
        OrganizerService.getOrganizerById(raw_booking?.organizerId || ''),
        EventVendorService.getVendorById(vendor_id || ''),
        EventService.getEventByID(raw_booking?.eventId || '')
    ]);

    // mapToOrganizer answers a missing document with a placeholder named "unknown"
    // rather than null, so an absent organizer would render as the literal word.
    const rawOrganizerName = organizer?.organization?.name;
    const organizerName = rawOrganizerName && rawOrganizerName !== "unknown" ? rawOrganizerName : "Organizer";
    const payment = raw_booking?.payment;
    const schedule = payment?.paymentSchedule || [];
    const documents = raw_booking?.documents;
    const documentLinks = [
        { label: "Quote PDF", url: documents?.quotePdf },
        { label: "Invoice PDF", url: documents?.invoicePdf },
        { label: "Receipt PDF", url: documents?.receiptPdf },
    ].filter((d) => Boolean(d.url));

    return (
        <div className="px-4 py-8 font-sans text-ink sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title={event?.title || "Booking"}
                    description={`${organizerName} • Booking ${raw_booking.bookingId}`}
                    actions={
                        <>
                            <StatusBadge status={raw_booking.status} />
                            <Link href={`/vendor/${vendor_id}/bookings`} className={buttonClass("secondary", "md")}>
                                Back to bookings
                            </Link>
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">

                    {/* ================= LEFT COLUMN ================= */}
                    <div className="space-y-10 lg:col-span-7 xl:col-span-8">

                        <section>
                            <SectionHeading>Booking journey</SectionHeading>

                            {raw_booking?.statusHistory?.length ? (
                                <ol className="relative space-y-6 border-l border-line pl-6">
                                    {raw_booking.statusHistory.map((s: any, index: number) => (
                                        <li key={index} className="relative">
                                            <span
                                                className="absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-white"
                                                aria-hidden="true"
                                            >
                                                <Check size={10} strokeWidth={3} />
                                            </span>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <h3 className="text-sm font-medium capitalize text-ink">
                                                    {s?.status?.replace(/_/g, ' ') || 'Unknown status'}
                                                </h3>
                                                <span className="text-xs text-ink-soft tabular-nums">{formatDateTime(s?.timestamp)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <EmptyState
                                    size="sm"
                                    icon={<History size={22} />}
                                    title="No status history yet"
                                    description="Each time this booking changes state, the change is recorded here."
                                />
                            )}

                            {raw_booking?.completedAt ? (
                                <p className="mt-6 border-t border-line pt-4 text-sm text-ink-soft tabular-nums">
                                    Completed {formatDate(raw_booking.completedAt)}
                                </p>
                            ) : null}
                        </section>

                        <section>
                            <SectionHeading>Service overview</SectionHeading>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Service type</dt>
                                    <dd className="mt-1 text-sm font-medium capitalize text-ink">{raw_booking?.serviceType || 'Not specified'}</dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Event</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink">{event?.title || 'Unknown event'}</dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Location</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink">{raw_booking?.requirements?.location || 'Not specified'}</dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Guest count</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink tabular-nums">{raw_booking?.requirements?.guestCount || 0}</dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Service date</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink tabular-nums">{formatDate(raw_booking?.requirements?.serviceDate)}</dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Service time</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink tabular-nums">
                                        {formatTime(raw_booking?.requirements?.startTime)} – {formatTime(raw_booking?.requirements?.endTime)}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        {/* Only rendered when there is delivery data. It used to print
                            "ARRIVED —" on every booking, including ones nobody had
                            delivered yet. */}
                        {(raw_booking?.delivery?.scheduledTime || raw_booking?.delivery?.actualDeliveryTime) && (
                            <section>
                                <SectionHeading>Delivery</SectionHeading>
                                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {raw_booking.delivery?.scheduledTime && (
                                        <div>
                                            <dt className="text-2xs font-medium uppercase text-ink-soft">Scheduled</dt>
                                            <dd className="mt-1 font-display text-lg text-ink tabular-nums">
                                                {formatTime(raw_booking.delivery.scheduledTime)}
                                            </dd>
                                        </div>
                                    )}
                                    {raw_booking.delivery?.actualDeliveryTime && (
                                        <div>
                                            <dt className="text-2xs font-medium uppercase text-ink-soft">Arrived</dt>
                                            <dd className="mt-1 font-display text-lg text-ink tabular-nums">
                                                {formatTime(raw_booking.delivery.actualDeliveryTime)}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </section>
                        )}
                    </div>

                    {/* ================= RIGHT COLUMN ================= */}
                    <div className="space-y-10 lg:col-span-5 xl:col-span-4">

                        <section>
                            <SectionHeading>Financials</SectionHeading>
                            <p className="text-2xs font-medium uppercase text-ink-soft">Agreed budget</p>
                            <p className="mt-1 font-display text-3xl text-ink tabular-nums">
                                {formatCurrency(payment?.totalAmount || 0, payment?.currency || 'PKR')}
                            </p>

                            {schedule.length > 0 ? (
                                <ul className="mt-5 divide-y divide-line border-t border-line">
                                    {schedule.map((installment: any, i: number) => (
                                        <li key={i} className="flex items-center justify-between gap-2 py-3">
                                            <span className="text-sm text-ink">{installment?.installment || 'Installment'}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-ink tabular-nums">
                                                    {formatCurrency(installment?.amount, payment?.currency || 'PKR')}
                                                </span>
                                                <StatusBadge status={installment?.status || 'pending'} size="sm" />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">No payment schedule agreed yet.</p>
                            )}

                            {payment?.commission?.platformCommission ? (
                                <p className="mt-4 text-xs text-ink-soft tabular-nums">
                                    Includes {formatCurrency(payment.commission.platformCommission, payment?.currency || 'PKR')} platform commission.
                                </p>
                            ) : null}
                        </section>

                        <section>
                            <SectionHeading>Contract</SectionHeading>
                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Organizer</dt>
                                    <dd className="mt-1 truncate text-sm font-medium text-ink">
                                        {raw_booking?.contract?.signedByOrganizer || 'Not signed'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Vendor</dt>
                                    <dd className="mt-1 truncate text-sm font-medium text-ink">
                                        {vendor?.businessName || 'Unknown vendor'}
                                    </dd>
                                </div>
                            </dl>

                            {raw_booking?.contract?.signed && raw_booking?.contract?.contractUrl ? (
                                <a
                                    href={raw_booking.contract.contractUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonClass("primary", "md", "mt-5 w-full")}
                                >
                                    <FileText size={16} />
                                    View contract PDF
                                </a>
                            ) : (
                                <p className="mt-5 rounded-lg border border-dashed border-line-loud px-4 py-3 text-center text-sm text-ink-soft">
                                    Contract pending
                                </p>
                            )}

                            <ul className="mt-4 space-y-2 text-xs text-ink-soft">
                                <li>{raw_booking?.contract?.terms?.cancellationPolicy || 'No cancellation policy specified.'}</li>
                                <li>{raw_booking?.contract?.terms?.liability || 'No liability terms specified.'}</li>
                            </ul>
                        </section>

                        <section>
                            <SectionHeading>Documents</SectionHeading>
                            {/* Was a MediaUploadField with no surrounding form and no action:
                                the file uploaded, the URL landed in a hidden input, and
                                nothing ever read it. Show what exists instead of offering
                                an upload that discards. */}
                            {documentLinks.length > 0 ? (
                                <ul className="divide-y divide-line border-t border-line">
                                    {documentLinks.map((doc) => (
                                        <li key={doc.label}>
                                            <a
                                                href={doc.url as string}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 py-3 text-sm text-ink hover:underline"
                                            >
                                                <FileText size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                                                {doc.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState
                                    size="sm"
                                    icon={<FileText size={22} />}
                                    title="No documents yet"
                                    description="Quotes, invoices and receipts generated for this booking are filed here."
                                />
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
