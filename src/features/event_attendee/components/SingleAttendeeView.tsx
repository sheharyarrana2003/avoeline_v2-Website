"use client"
import { Registration } from "@/src/services/models/reg.type";

import { Mail, Phone, CheckCircle2, X, CreditCard, Tag, Award, MessageSquare, Star, ChevronDown } from "lucide-react";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { AttendeeClientSideProp } from "./AttendeeClientSide";
import { formatDateTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { statusMeta } from "@/src/lib/status";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { useToast } from "@/src/shared_components/ui/Toast";
import { ConfirmDialog, ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { buttonClass } from "@/src/lib/ui";
import { setCheckIn } from "@/src/features/event_attendee/actions/checkIn.action";
import { decideRegistration } from "@/src/features/access/actions/registrationDecision.action";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import type { ActionResult } from "@/src/lib/action";
import { fieldClass, labelClass } from "@/src/lib/ui";

interface SingleAttendeeViewProps {
    combined_data: AttendeeClientSideProp;
    onClose: () => void;
    update_registration?: (updatedRegistration: Registration) => Promise<void> | void;
}

const STATUS_OPTIONS: Registration["status"][] = [
    "pending",
    "confirmed",
    "checked_in",
    "attended",
    "cancelled",
    "no_show",
    "awaiting_payment",
];

const PAYMENT_STATUS_OPTIONS: Registration["payment"]["paymentStatus"][] = [
    "pending",
    "completed",
    "failed",
    "refunded",
];

/**
 * Values worth stopping for. These were one scroll-wheel tick away on a
 * focused <select> that wrote straight to Firestore -- cancelling a
 * registration or marking a payment refunded took a single accidental gesture.
 */
const SERIOUS_STATUS = new Set<string>(["cancelled", "no_show"]);
const SERIOUS_PAYMENT = new Set<string>(["refunded", "failed"]);

export function SingleAttendeeView({
    combined_data,
    onClose,
    update_registration
}: SingleAttendeeViewProps) {
    // 1. Safely extract core data
    const a = combined_data?.a || {} as any;
    const u = combined_data?.user || {} as any;
    const r = combined_data?.register || {} as any;
    const proofUrl = combined_data?.proofUrl ?? null;

    // State for local registration updates
    const [registration, setRegistration] = useState<Registration>(r);
    const [isUpdating, setIsUpdating] = useState(false);
    // A change waiting on the confirmation dialog. The selects stay controlled
    // by `registration`, so cancelling snaps them back on its own.
    const [pending, setPending] = useState<{ kind: "status" | "payment"; value: string } | null>(null);
    const toast = useToast();

    const fullName = u?.profile?.fullName || "Unknown Attendee";
    const email = u?.email || "No email provided";
    const phone = u?.profile?.phoneNumber || "No phone provided";

    const organization = a?.academic?.university || "Not Provided";
    const currency = registration?.payment?.currency || "PKR";

    const amountPaid = registration?.payment?.amountPaid ?? 0;
    const finalPrice = registration?.finalPrice ?? amountPaid;
    const ticketType = registration?.pricingTier || "General";
    const discount = registration?.discountApplied;

    const [checkInState, checkInAction] = useActionState<ActionResult | null, FormData>(setCheckIn, null);
    const [decisionState, decisionAction] = useActionState<ActionResult | null, FormData>(
        async (_prev: ActionResult | null, fd: FormData) => decideRegistration(fd),
        null,
    );

    const isCheckedIn = Boolean(registration?.checkIn?.checkedIn) || registration?.status === "checked_in";

    const checkInTime = registration?.checkIn?.checkInTime ? formatDateTime(registration.checkIn.checkInTime) : null;
    const checkInMethod = registration?.checkIn?.checkInMethod
        ? registration.checkIn.checkInMethod.replace("_", " ")
        : "—";

    const department = a?.academic?.department || "Not Specified";
    const gradYear = a?.academic?.graduationYear || "Not Specified";
    const locationInfo = u?.location ? `${u.location.city}, ${u.location.country}` : "Not Specified";

    /**
     * Commit an optimistic update, and put the old value back if the write
     * fails. Previously the local state was set before the await and never
     * reverted, so a failed write left the screen showing a status Firestore
     * had refused -- and the only trace was a console.error.
     */
    const commit = async (updated: Registration, what: string) => {
        const previous = registration;
        setRegistration(updated);

        if (!update_registration) return;

        setIsUpdating(true);
        try {
            await update_registration(updated);
            toast.success(`${what} updated.`);
        } catch (err) {
            console.error(`Failed to update ${what.toLowerCase()}:`, err);
            setRegistration(previous);
            toast.error(`Could not update the ${what.toLowerCase()}. Nothing was changed.`);
        } finally {
            setIsUpdating(false);
        }
    };

    const withStatus = (newStatus: Registration["status"]): Registration => ({
        ...registration,
        status: newStatus,
        statusHistory: [
            ...(registration.statusHistory || []),
            { status: newStatus, timestamp: new Date().toISOString() },
        ],
    });

    /**
     * Verifying a payment also confirms the registration.
     *
     * These were independent, so marking a payment "completed" left the
     * registration sitting at awaiting_payment forever -- the organizer had
     * verified the transfer while the attendee's own ticket still told them their
     * place was only held pending payment. The two fields describe one fact.
     *
     * Only promotes FROM awaiting_payment: someone already checked_in or attended
     * must not be demoted to merely confirmed by a late payment reconciliation.
     * The reverse direction (a payment later failing or being refunded) is
     * deliberately left alone -- a refund can follow a cancellation as easily as
     * cause one, and guessing which would be inventing policy.
     */
    const withPaymentStatus = (
        newPaymentStatus: Registration["payment"]["paymentStatus"],
    ): Registration => {
        const confirms = newPaymentStatus === "completed" && registration.status === "awaiting_payment";

        return {
            ...registration,
            payment: { ...registration.payment, paymentStatus: newPaymentStatus },
            ...(confirms
                ? {
                    status: "confirmed" as const,
                    statusHistory: [
                        ...(registration.statusHistory || []),
                        { status: "confirmed" as const, timestamp: new Date().toISOString() },
                    ],
                }
                : {}),
        };
    };

    const handleStatusChange = (newStatus: Registration["status"]) => {
        // Only the consequential ones ask. Confirming every change would train
        // people to click through the dialog without reading it.
        if (SERIOUS_STATUS.has(newStatus)) {
            setPending({ kind: "status", value: newStatus });
            return;
        }
        void commit(withStatus(newStatus), "Registration status");
    };

    /** Says what actually happened, since verifying a payment can also confirm. */
    const paymentLabel = (newPaymentStatus: Registration["payment"]["paymentStatus"]): string =>
        newPaymentStatus === "completed" && registration.status === "awaiting_payment"
            ? "Payment and registration"
            : "Payment status";

    const handlePaymentStatusChange = (
        newPaymentStatus: Registration["payment"]["paymentStatus"],
    ) => {
        if (SERIOUS_PAYMENT.has(newPaymentStatus)) {
            setPending({ kind: "payment", value: newPaymentStatus });
            return;
        }
        void commit(withPaymentStatus(newPaymentStatus), paymentLabel(newPaymentStatus));
    };

    const confirmPending = () => {
        if (!pending) return;
        const { kind, value } = pending;
        setPending(null);
        if (kind === "status") {
            void commit(withStatus(value as Registration["status"]), "Registration status");
        } else {
            void commit(
                withPaymentStatus(value as Registration["payment"]["paymentStatus"]),
                paymentLabel(value as Registration["payment"]["paymentStatus"]),
            );
        }
    };

    return (
        <div className="relative flex flex-col gap-8 p-6">
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close attendee details"
                    className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    <X size={18} aria-hidden="true" />
                </button>
            )}

            <header className="pr-8">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-2xl text-ink">{fullName}</h3>
                    <StatusBadge status={registration.status} size="sm" />
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                    {/* gray-400 is 2.5:1 -- decoration only; the address beside it is the content. */}
                    <Mail size={14} className="text-ink-faint" aria-hidden="true" />
                    {email}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft tabular-nums">
                    <Phone size={14} className="text-ink-faint" aria-hidden="true" />
                    {phone}
                </p>
            </header>

            <section>
                <label className={labelClass} htmlFor="attendee-registration-status">Registration status</label>
                <div className="relative mt-2">
                    <select
                        id="attendee-registration-status"
                        value={registration.status || "pending"}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(e.target.value as Registration["status"])}
                        className={`${fieldClass} appearance-none pr-9 capitalize`}
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status.replace("_", " ")}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                </div>
            </section>

            <section>
                <Heading>Ticket</Heading>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Ticket type" value={ticketType} />
                    <Field label="Final price" value={formatCurrency(finalPrice, currency)} />
                    <Field label="Organization" value={organization} />
                    {registration?.registrationSource && (
                        <Field label="Source" value={registration.registrationSource.replace("_", " ")} />
                    )}
                </div>
            </section>

            {registration?.status === "pending" ? (
                <section className="rounded-2xl border border-line bg-paper p-4">
                    <p className="text-sm font-medium text-ink">Waiting on your approval</p>
                    <p className="mt-1 text-xs text-ink-soft">
                        This event holds new registrations until you decide. They are emailed either way.
                    </p>
                    {decisionState?.error ? <FormFeedback error={decisionState.error} className="mt-3" /> : null}
                    {/* One form, two submit buttons -- the submitter's name/value is
                        what tells the action which way to go. */}
                    <form action={decisionAction} className="mt-3 flex flex-wrap gap-2">
                        <input type="hidden" name="eventId" value={registration.eventId} />
                        <input type="hidden" name="registrationId" value={registration.registrationId} />
                        <button type="submit" name="decision" value="approve" className={buttonClass("primary", "sm")}>
                            Approve
                        </button>
                        <ConfirmSubmit
                            name="decision"
                            value="reject"
                            title={`Reject ${registration.attendee?.name || "this registration"}?`}
                            description="They are emailed to say the organizer did not approve it, and their seat is released to anyone on the waitlist."
                            confirmLabel="Reject registration"
                            className={buttonClass("destructive", "sm")}
                        >
                            Reject
                        </ConfirmSubmit>
                    </form>
                </section>
            ) : null}

            {registration?.status === "waitlisted" ? (
                <section className="rounded-2xl border border-line bg-paper p-4">
                    <p className="text-sm font-medium text-ink">
                        On the waitlist{registration.waitlistPosition ? ` — position ${registration.waitlistPosition}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                        Promoted automatically, in order, when a place frees up.
                    </p>
                </section>
            ) : null}

            <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper p-4">
                <CheckCircle2
                    size={20}
                    className={`shrink-0 ${isCheckedIn ? "text-ink" : "text-ink-faint"}`}
                    aria-hidden="true"
                />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                        {isCheckedIn ? `Checked in${checkInTime ? ` at ${checkInTime}` : ""}` : "Not checked in"}
                    </p>
                    <p className="text-xs capitalize text-ink-soft">
                        {isCheckedIn ? `Method: ${checkInMethod}` : "Mark them in when they arrive"}
                    </p>
                </div>
                {/* A plain form, so this works with JS off and needs no state here.
                    The action takes an id and a boolean -- the timestamp and the
                    operator are the server's to decide. */}
                <form action={checkInAction} className="ml-auto">
                    <input type="hidden" name="registrationId" value={registration?.registrationId ?? ""} />
                    <input type="hidden" name="checkedIn" value={isCheckedIn ? "false" : "true"} />
                    <button type="submit" className={buttonClass(isCheckedIn ? "secondary" : "primary", "sm")}>
                        {isCheckedIn ? "Undo check-in" : "Check in"}
                    </button>
                </form>
                {checkInState?.error ? <FormFeedback error={checkInState.error} className="w-full" /> : null}
            </section>

            <section>
                <Heading>Academic details</Heading>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Department" value={department} />
                    <Field label="Graduation year" value={String(gradYear)} />
                    <Field label="Location" value={locationInfo} />
                </div>
            </section>

            <section>
                <Heading icon={<CreditCard size={14} />}>Payment and pricing</Heading>

                <div className="grid grid-cols-2 gap-4">
                    <Field
                        label="Payment method"
                        value={registration?.payment?.paymentMethod?.replace("_", " ") || "N/A"}
                    />
                    <div>
                        <label className={labelClass} htmlFor="attendee-payment-status">Payment status</label>
                        <div className="relative mt-1">
                            <select
                                id="attendee-payment-status"
                                value={registration?.payment?.paymentStatus || "pending"}
                                disabled={isUpdating}
                                onChange={(e) => handlePaymentStatusChange(e.target.value as Registration["payment"]["paymentStatus"])}
                                className={`${fieldClass} appearance-none pr-9 capitalize`}
                            >
                                {PAYMENT_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                {/* Sits directly under the payment-status control because it is the
                    evidence for it: the organizer looks at the screenshot, then moves
                    the status. Shown only when a proof exists -- an empty frame reads
                    as a broken image rather than "nothing was sent". */}
                {proofUrl ? (
                    <div className="mt-4">
                        <p className={labelClass}>Payment proof</p>
                        <ImageLightbox
                            src={proofUrl}
                            alt="Payment screenshot supplied by the attendee"
                            className="mt-1.5 aspect-video w-full bg-muted"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={proofUrl}
                                alt=""
                                className="absolute inset-0 h-full w-full object-contain"
                            />
                        </ImageLightbox>
                        <p className="mt-1.5 text-xs text-ink-soft">Click to enlarge before verifying.</p>
                    </div>
                ) : registration?.status === "awaiting_payment" ? (
                    <p className="mt-4 text-xs text-ink-soft">
                        No payment proof was uploaded with this registration.
                    </p>
                ) : null}

                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm tabular-nums">
                    {discount && (
                        <div className="flex items-center justify-between text-ink-soft">
                            <dt>Original price</dt>
                            <dd className="line-through">{formatCurrency(discount.originalPrice, currency)}</dd>
                        </div>
                    )}

                    {discount && (
                        <div className="flex items-center justify-between text-ink">
                            <dt className="flex items-center gap-1.5 capitalize">
                                <Tag size={12} aria-hidden="true" /> {discount.type} discount
                            </dt>
                            <dd>-{discount.percentage}%</dd>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-ink">
                        <dt>Final price</dt>
                        <dd>{formatCurrency(finalPrice, currency)}</dd>
                    </div>

                    <div className="flex items-center justify-between font-medium text-ink">
                        <dt>Amount paid</dt>
                        <dd>{formatCurrency(amountPaid, currency)}</dd>
                    </div>

                    {finalPrice > amountPaid && (
                        <div className="flex items-center justify-between font-medium text-ink">
                            <dt>Balance due</dt>
                            <dd>{formatCurrency(finalPrice - amountPaid, currency)}</dd>
                        </div>
                    )}
                </dl>
            </section>

            {registration?.certificate && (
                <section>
                    <Heading icon={<Award size={14} />}>Certificate</Heading>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Status" value={registration.certificate.issued ? "Issued" : "Not issued"} />
                        <Field label="Type" value={registration.certificate.type || "N/A"} />
                        {registration.certificate.issueDate && (
                            <Field label="Issue date" value={formatDateTime(registration.certificate.issueDate)} />
                        )}
                    </div>
                </section>
            )}

            <section>
                <Heading icon={<MessageSquare size={14} />}>Communication history</Heading>
                {registration?.communications && registration.communications.length > 0 ? (
                    <ul className="space-y-2">
                        {registration.communications.map((comm, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm capitalize text-ink">{comm.type.replace("_", " ")}</p>
                                    <p className="truncate text-xs capitalize text-ink-soft tabular-nums">{comm.channel} • {formatDateTime(comm.sentAt)}</p>
                                </div>
                                <StatusBadge status={comm.status} size="sm" />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-ink-soft">Nothing has been sent to this attendee yet.</p>
                )}
            </section>

            {registration?.feedbackSubmitted && (
                <section>
                    <Heading icon={<Star size={14} />}>Feedback</Heading>
                    <Field label="Rating" value={registration.rating ? `${registration.rating} / 5` : "Not rated"} />
                </section>
            )}

            <ConfirmDialog
                open={pending !== null}
                title={
                    pending?.kind === "status"
                        ? `Mark ${fullName} as ${statusMeta(pending.value).label.toLowerCase()}?`
                        : `Mark this payment ${statusMeta(pending?.value).label.toLowerCase()}?`
                }
                description={
                    pending?.kind === "status"
                        ? "This changes the attendee's registration and is recorded in their status history. They may lose access to the event."
                        : "This changes the recorded payment state for this registration. Make sure it matches what actually happened with the money."
                }
                confirmLabel="Yes, change it"
                busy={isUpdating}
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}

/** Panel sub-heading. A rule instead of yet another card inside the drawer. */
function Heading({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
    return (
        <h4 className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-2xs font-medium uppercase text-ink-soft">
            {icon ? <span aria-hidden="true">{icon}</span> : null}
            {children}
        </h4>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className={labelClass}>{label}</p>
            <p className="mt-1 break-words text-sm capitalize text-ink tabular-nums">{value}</p>
        </div>
    );
}
