import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { FeedbackService } from "@/src/services/feedback.service";
import { OrganizerReviewForm } from "@/src/features/bookings/components/OrganizerReviewForm";
import { formatCurrency } from "@/src/lib/money";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { buttonClass } from "@/src/lib/ui";
import { Check, CalendarDays, ClipboardList, FileText, Files, Star, Wallet } from "lucide-react";
import type { ReactNode } from "react";

export default async function BookingDetailsPage({ params }: { params: Promise<{ organizer_id: string, booking_id: string }> }) {
    const { organizer_id, booking_id } = await params;

    const raw_booking: BookingData | null = await BookingServices.getBookingById(booking_id);
    if (!raw_booking) {
        notFound();
    }

    const [vendor, event, existingReview] = await Promise.all([
        EventVendorService.getVendorById(raw_booking?.vendorId || ''),
        EventService.getEventByID(raw_booking?.eventId || ''),
        FeedbackService.getVendorReviewByBooking(booking_id)
    ])

    const isCompleted = raw_booking?.status === "completed";
    const currency = raw_booking?.payment?.currency || 'PKR';
    const documents = [
        { label: "Quote PDF", url: raw_booking?.documents?.quotePdf },
        { label: "Invoice PDF", url: raw_booking?.documents?.invoicePdf },
    ].filter((d) => Boolean(d.url)) as { label: string; url: string }[];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <PageHeader
                title={vendor?.businessName || "Vendor booking"}
                description={event?.title}
                actions={<StatusBadge status={raw_booking?.status} />}
            />

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                <div className="space-y-10 lg:col-span-7 xl:col-span-8">
                    <section>
                        <Heading icon={<CalendarDays size={16} />}>Booking journey</Heading>

                        {raw_booking?.statusHistory?.length ? (
                            <ol className="mb-6 space-y-6 border-l border-line pl-6">
                                {raw_booking.statusHistory.map((s: any, index: number) => (
                                    <li key={index} className="relative">
                                        {/* Every entry in the history has already happened, so every
                                            dot is filled. The old code computed `isCompleted = true`
                                            and then branched on it. */}
                                        <span className="absolute -left-[31px] flex size-4 items-center justify-center rounded-full bg-ink text-ink-invert" aria-hidden="true">
                                            <Check className="h-2.5 w-2.5" strokeWidth={4} />
                                        </span>
                                        <div className="flex items-start justify-between gap-4">
                                            <p className="text-sm font-medium capitalize text-ink">{s?.status?.replace('_', ' ') || 'Unknown status'}</p>
                                            <span className="shrink-0 text-sm text-ink-soft tabular-nums">{formatDate(s?.timestamp)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <EmptyState
                                size="sm"
                                icon={<CalendarDays className="h-5 w-5" />}
                                title="No status history"
                                description="Every change to this booking will be listed here with its date."
                            />
                        )}

                        {raw_booking?.completedAt && (
                            <p className="border-t border-line pt-4 text-sm text-ink-soft tabular-nums">
                                Completed: <span className="font-medium text-ink">{formatDate(raw_booking.completedAt)}</span>
                            </p>
                        )}
                    </section>

                    <section>
                        <Heading icon={<ClipboardList size={16} />}>Service overview</Heading>
                        {/* "Special requirements" used to be two hardcoded chips reading
                            VEGETARIAN and GLUTEN-FREE for every booking in the product, and
                            the event name fell back to an invented title. Both are gone. */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <Field label="Service type" value={raw_booking?.serviceType || 'N/A'} />
                            <Field label="Event" value={event?.title || 'Unknown event'} />
                            <Field label="Location" value={raw_booking?.requirements?.location || 'Not specified'} />
                            <Field label="Guest count" value={`${raw_booking?.requirements?.guestCount ?? 0}`} />
                            <Field
                                label="Service time"
                                value={`${formatTime(raw_booking?.requirements?.startTime)} – ${formatTime(raw_booking?.requirements?.endTime)}`}
                            />
                            {raw_booking?.requirements?.specialInstructions && (
                                <Field label="Special instructions" value={raw_booking.requirements.specialInstructions} />
                            )}
                            {/* The requirements text the organizer typed on the quote form
                                was stored and then never shown anywhere. */}
                            {raw_booking?.requirements?.description && (
                                <div className="md:col-span-2">
                                    <Field label="Requirements" value={raw_booking.requirements.description} />
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <Heading icon={<Star size={16} />}>Your review</Heading>

                        {existingReview ? (
                            <div className="rounded-2xl border border-line bg-paper p-5">
                                <div className="mb-2 flex items-center gap-2">
                                    <StarRating rating={existingReview.rating} size="sm" />
                                    <span className="text-sm font-medium text-ink tabular-nums">{existingReview.rating}.0</span>
                                    <span className="ml-auto text-xs text-ink-soft tabular-nums">
                                        {existingReview.createdAt ? formatDate(existingReview.createdAt) : ''}
                                    </span>
                                </div>
                                {existingReview.title && (
                                    <p className="text-sm font-medium text-ink">{existingReview.title}</p>
                                )}
                                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{existingReview.comment}</p>
                                <p className="mt-3 text-2xs font-medium uppercase text-ink-soft">
                                    Published on {vendor?.businessName || "the vendor"}&apos;s profile
                                </p>
                            </div>
                        ) : isCompleted ? (
                            <OrganizerReviewForm
                                bookingId={booking_id}
                                organizerId={organizer_id}
                                vendorId={raw_booking?.vendorId || ''}
                                vendorName={vendor?.businessName || "this vendor"}
                            />
                        ) : (
                            <p className="text-sm text-ink-soft">
                                You can review this vendor once the booking is completed.
                            </p>
                        )}
                    </section>
                </div>

                <div className="space-y-10 lg:col-span-5 xl:col-span-4">
                    <section>
                        <Heading icon={<Wallet size={16} />}>Financials</Heading>

                        <p className="text-2xs font-medium uppercase text-ink-soft">Agreed budget</p>
                        <p className="font-display text-3xl text-ink tabular-nums">
                            {formatCurrency(raw_booking?.payment?.totalAmount || 0, currency)}
                        </p>

                        <ul className="mt-6 space-y-2">
                            {raw_booking?.payment?.paymentSchedule?.length ? (
                                raw_booking.payment.paymentSchedule.map((installment: any, i: number) => (
                                    <li key={i} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-b-0">
                                        <span className="text-sm capitalize text-ink">{installment?.installment || 'Unknown'} installment</span>
                                        <StatusBadge status={installment?.status === 'paid' ? 'paid' : 'pending'} size="sm" />
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm text-ink-soft">No payment schedule agreed yet.</li>
                            )}
                        </ul>

                        <p className="mt-4 text-2xs uppercase text-ink-soft tabular-nums">
                            Platform commission: {formatCurrency(raw_booking?.payment?.commission?.platformCommission || 0, currency)} included
                        </p>
                    </section>

                    <section>
                        <Heading icon={<FileText size={16} />}>Contract</Heading>

                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <Field label="Organizer" value={raw_booking?.contract?.signedByOrganizer || 'Not signed'} />
                            <Field label="Vendor" value={vendor?.businessName || 'Unknown vendor'} />
                        </div>

                        {raw_booking?.contract?.signed && raw_booking?.contract?.contractUrl ? (
                            <Link
                                href={raw_booking.contract.contractUrl}
                                target="_blank"
                                className={buttonClass("primary", "md", "w-full")}
                            >
                                View contract PDF
                            </Link>
                        ) : (
                            <p className="rounded-lg border border-dashed border-line-loud px-4 py-3 text-center text-sm text-ink-soft">
                                Contract pending
                            </p>
                        )}

                        <ul className="mt-4 space-y-2 text-xs text-ink-soft">
                            <li>{raw_booking?.contract?.terms?.cancellationPolicy || 'No cancellation policy specified.'}</li>
                            <li>{raw_booking?.contract?.terms?.liability || 'No liability terms specified.'}</li>
                        </ul>
                    </section>

                    <section>
                        <Heading icon={<Files size={16} />}>Documents</Heading>

                        {/* Both rows used to render unconditionally, each an icon beside an
                            empty <div> linking to "#" — a document that did not exist looked
                            exactly like one that did. The upload button below them had no
                            handler at all and has been removed rather than left looking live. */}
                        {documents.length > 0 ? (
                            <ul className="space-y-2">
                                {documents.map((doc) => (
                                    <li key={doc.label}>
                                        <Link
                                            href={doc.url}
                                            target="_blank"
                                            className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm text-ink transition hover:bg-muted"
                                        >
                                            <FileText className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                                            {doc.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                size="sm"
                                icon={<Files className="h-5 w-5" />}
                                title="No documents yet"
                                description="The quote and invoice PDFs appear here once the vendor issues them."
                            />
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

/** Section heading. A rule instead of a white card on an almost-white canvas. */
function Heading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <h2 className="mb-5 flex items-center gap-2 border-b border-line pb-2 font-display text-lg text-ink">
            {/* gray-400 is 2.5:1 — decoration only, the heading text carries the meaning. */}
            <span className="text-ink-faint" aria-hidden="true">{icon}</span>
            {children}
        </h2>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-2xs font-medium uppercase text-ink-soft">{label}</p>
            <p className="mt-1 break-words text-sm capitalize text-ink tabular-nums">{value}</p>
        </div>
    );
}
