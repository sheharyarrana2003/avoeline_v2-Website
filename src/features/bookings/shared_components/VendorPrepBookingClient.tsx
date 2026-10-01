"use client";

import { useState, useTransition } from "react";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { Documents } from "@/src/features/bookings/types";
import { formatCurrency } from "@/src/lib/money";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { DateField } from "@/src/shared_components/DateField";
import { ListPlus, Plus, X } from "lucide-react";

// --- Types ---

interface QuoteItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

interface VendorService {
    id: string;
    name: string;
    description: string;
    basePrice: number;
}

interface EventDetails {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    guestCount: number;
    fromEvent?: {
        date?: boolean;
        startTime?: boolean;
        endTime?: boolean;
        location?: boolean;
    };
}

interface Requirements {
    description: string;
    serviceDate: string;
    startTime: string;
    endTime: string;
    location: string;
    guestCount: number;
    specialInstructions: string;
}

interface ExistingQuote {
    basePrice: number;
    additionalCharges: { description: string; amount: number }[];
    discount: number;
    totalAmount: number;
    breakdown: { item: string; quantity: number; unitPrice: number; total: number }[];
    terms: string;
    validity: string;
}

interface InitialData {
    bookingId: string;
    eventId: string;
    eventDetails: EventDetails;
    organizerId: string;
    organizerName: string;
    requirements: Requirements;
    existingQuote: ExistingQuote | null;
    currency: string;
    communications: unknown[];
    documents: Documents;
    vendorServices: VendorService[];
    status: string;
}

interface PrepQuotePayload {
    bookingId: string;
    vendorId: string;
    servicePackage: string;
    items: { description: string; quantity: number; unitPrice: number }[];
    taxRate: number;
    discountAmount: number;
    customizations: string[];
    terms: string;
    validityDate: string;
    internalNotes: string;
    totalAmount: number;
    currency: string;
}

// --- Props Interface ---
interface PrepareQuoteClientProps {
    vendorId: string;
    initialData: InitialData;
    handling_prep_quote: (payload: PrepQuotePayload) => Promise<void>;
}

// --- Helper Functions ---
const parseValidityDate = (validity: string | undefined): string => {
    if (!validity) {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date.toISOString().split("T")[0];
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(validity)) return validity.slice(0, 10);
    const m = validity.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split("T")[0];
};

const extractItemsFromExistingQuote = (
    existingQuote: ExistingQuote | null
): QuoteItem[] => {
    if (!existingQuote?.breakdown || existingQuote.breakdown.length === 0) {
        return [];
    }
    return existingQuote.breakdown.map((b, index) => ({
        id: `existing-${index}`,
        description: b.item,
        quantity: b.quantity,
        unitPrice: b.unitPrice,
    }));
};

export default function PrepareQuoteClient({
    vendorId,
    initialData,
    handling_prep_quote,
}: PrepareQuoteClientProps) {
    const {
        requirements,
        existingQuote,
        currency,
        eventDetails,
        organizerName,
        bookingId,
        vendorServices,
    } = initialData;

    // --- State ---
    const [servicePackage, setServicePackage] = useState<string>(
        vendorServices.length > 0 ? vendorServices[0].name : "Custom Quote"
    );

    // Initialize items from existing quote or empty
    const [items, setItems] = useState<QuoteItem[]>(
        extractItemsFromExistingQuote(existingQuote)
    );

    const [taxRate, setTaxRate] = useState<number>(15);
    const [discountAmount, setDiscountAmount] = useState<number>(
        existingQuote?.discount || 0
    );
    const platformFeePercent = 2.5;

    const [terms, setTerms] = useState<string>(existingQuote?.terms || "");

    const [validityDate, setValidityDate] = useState<string>(
        parseValidityDate(existingQuote?.validity)
    );

    // --- Computed Values ---
    const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
    );
    const tax = Math.round(subtotal * (taxRate / 100));
    const platformFee = Math.round(
        (subtotal + tax - discountAmount) * (platformFeePercent / 100)
    );
    const totalAmount = subtotal + tax - discountAmount + platformFee;

    // --- Handlers ---
    const updateItem = (
        id: string,
        field: keyof Omit<QuoteItem, "id">,
        value: string | number
    ): void => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const removeItem = (id: string): void => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const addLineItem = (): void => {
        setItems((prev) => [
            ...prev,
            { id: `item-${Date.now()}`, description: "", quantity: 1, unitPrice: 0 },
        ]);
    };

    const [isSubmitting, startSubmitting] = useTransition();

    const handleSubmit = (): void => {
        if (isSubmitting) return;

        const payload: PrepQuotePayload = {
            bookingId,
            vendorId,
            servicePackage,
            items: items.map(({ id: _id, ...rest }) => rest),
            taxRate,
            discountAmount,
            customizations: [],
            terms,
            validityDate,
            internalNotes: "",
            totalAmount,
            currency,
        };

        startSubmitting(async () => {
            await handling_prep_quote(payload);
        });
    };

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                {/* One submit control, in the masthead. The second one lived in a
                    `fixed bottom-0 left-0 right-0` bar that spanned the whole
                    viewport and sat on top of the 16rem nav rail. */}
                <PageHeader
                    title="Prepare quote"
                    description={`${eventDetails.title} • Request from ${organizerName}`}
                    actions={
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || items.length === 0}
                            aria-busy={isSubmitting}
                            className={buttonClass("primary", "lg")}
                        >
                            {isSubmitting ? "Submitting…" : `Send quote • ${formatCurrency(totalAmount, currency)}`}
                        </button>
                    }
                />

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                    {/* Left Column: Quote Builder */}
                    <div className="space-y-10 lg:col-span-8">

                        <section>
                            <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Service package</h2>
                            <label htmlFor="servicePackage" className={labelClass}>Package</label>
                            <select
                                id="servicePackage"
                                value={servicePackage}
                                onChange={(e) => setServicePackage(e.target.value)}
                                className={`${fieldClass} mt-2`}
                            >
                                {vendorServices.length > 0 ? (
                                    vendorServices.map((service) => (
                                        <option key={service.id} value={service.name}>
                                            {service.name} — {formatCurrency(service.basePrice, currency)}
                                        </option>
                                    ))
                                ) : (
                                    <option>Custom Quote</option>
                                )}
                            </select>
                        </section>

                        <section>
                            <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Itemized pricing</h2>

                            {items.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-12 gap-2 pb-3 pr-6 text-2xs font-medium uppercase text-ink-soft">
                                        <div className="col-span-5">Description</div>
                                        <div className="col-span-2 text-center">Qty</div>
                                        <div className="col-span-2 text-center">Unit price</div>
                                        <div className="col-span-2 text-right">Total</div>
                                        <div className="col-span-1" />
                                    </div>

                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="grid grid-cols-12 items-center gap-2 border-b border-line py-2 last:border-b-0"
                                        >
                                            <div className="col-span-5">
                                                <label className="sr-only" htmlFor={`desc-${item.id}`}>Description</label>
                                                <input
                                                    id={`desc-${item.id}`}
                                                    type="text"
                                                    value={item.description}
                                                    placeholder="e.g. Buffet, 200 covers"
                                                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                    className={fieldClass}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="sr-only" htmlFor={`qty-${item.id}`}>Quantity</label>
                                                <input
                                                    id={`qty-${item.id}`}
                                                    type="number"
                                                    min={0}
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                                                    className={`${fieldClass} text-center tabular-nums`}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="sr-only" htmlFor={`unit-${item.id}`}>Unit price</label>
                                                <input
                                                    id={`unit-${item.id}`}
                                                    type="number"
                                                    min={0}
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(item.id, "unitPrice", parseInt(e.target.value) || 0)}
                                                    className={`${fieldClass} text-center tabular-nums`}
                                                />
                                            </div>
                                            <div className="col-span-2 text-right text-sm font-medium text-ink tabular-nums">
                                                {formatCurrency(item.quantity * item.unitPrice, currency)}
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    aria-label={`Remove ${item.description || "line item"}`}
                                                    className={buttonClass("ghost", "sm", "px-2")}
                                                >
                                                    <X size={14} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <EmptyState
                                    size="sm"
                                    icon={<ListPlus size={22} />}
                                    title="No line items yet"
                                    description="A quote needs at least one priced line before it can be sent."
                                />
                            )}

                            <button
                                type="button"
                                onClick={addLineItem}
                                className={buttonClass("secondary", "md", "mt-4 w-full")}
                            >
                                <Plus size={16} aria-hidden="true" />
                                Add line item
                            </button>
                        </section>

                        <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <div>
                                <label htmlFor="taxRate" className={labelClass}>Tax rate (%)</label>
                                <input
                                    id="taxRate"
                                    type="number"
                                    min={0}
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                    className={`${fieldClass} mt-2 tabular-nums`}
                                />
                            </div>
                            <div>
                                <label htmlFor="discountAmount" className={labelClass}>Discount ({currency})</label>
                                <input
                                    id="discountAmount"
                                    type="number"
                                    min={0}
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                    className={`${fieldClass} mt-2 tabular-nums`}
                                />
                            </div>
                            <div>
                                {/* Was state with no control at all, so every quote silently
                                    expired 14 days out whether the vendor meant it to or not. */}
                                <label htmlFor="validityDate" className={labelClass}>Valid until</label>
                                <DateField
                                    id="validityDate"
                                    value={validityDate}
                                    onChange={(e) => setValidityDate(e.target.value)}
                                    className={`${fieldClass} mt-2 tabular-nums`}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Terms &amp; conditions</h2>
                            {/* The bold/italic/list buttons that sat above this had no
                                onClick and formatted nothing — the field is plain text. */}
                            <label htmlFor="terms" className="sr-only">Terms and conditions</label>
                            <textarea
                                id="terms"
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                                rows={5}
                                placeholder="Payment schedule, cancellation policy, what is not included…"
                                className={`${fieldClass} resize-none`}
                            />
                        </section>
                    </div>

                    {/* Right Column: Summary & Original Request */}
                    <div className="space-y-10 lg:col-span-4">
                        <section>
                            <h2 className="mb-4 border-b border-line pb-3 text-2xs font-medium uppercase text-ink-soft">Original request</h2>

                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Event date &amp; time</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink tabular-nums">
                                        {eventDetails.date ? formatDate(eventDetails.date) : "Not specified"}
                                        {eventDetails.date && eventDetails.fromEvent?.date && (
                                            <span className="font-normal text-ink-soft"> (event date)</span>
                                        )}
                                        {eventDetails.startTime && (
                                            <>
                                                {", "}
                                                {formatTime(eventDetails.startTime)}
                                                {eventDetails.endTime ? ` – ${formatTime(eventDetails.endTime)}` : ""}
                                                {(eventDetails.fromEvent?.startTime || eventDetails.fromEvent?.endTime) && (
                                                    <span className="font-normal text-ink-soft"> (event schedule)</span>
                                                )}
                                            </>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Guests</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink tabular-nums">
                                        {(eventDetails.guestCount || requirements.guestCount) || "Not specified"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-2xs font-medium uppercase text-ink-soft">Location</dt>
                                    <dd className="mt-1 text-sm font-medium text-ink">
                                        {eventDetails.location || requirements.location || "Not specified"}
                                        {eventDetails.location && eventDetails.fromEvent?.location && (
                                            <span className="font-normal text-ink-soft"> (event venue)</span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <section className="lg:sticky lg:top-8">
                            <h2 className="mb-4 border-b border-line pb-3 text-2xs font-medium uppercase text-ink-soft">Quote summary</h2>

                            <dl className="divide-y divide-line">
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Subtotal</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">{formatCurrency(subtotal, currency)}</dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft tabular-nums">Tax ({taxRate}%)</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">{formatCurrency(tax, currency)}</dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft">Discount</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">−{formatCurrency(discountAmount, currency)}</dd>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <dt className="text-sm text-ink-soft tabular-nums">Platform fee ({platformFeePercent}%)</dt>
                                    <dd className="text-sm font-medium text-ink tabular-nums">{formatCurrency(platformFee, currency)}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3 py-3">
                                    <dt className="text-sm font-medium text-ink">Total amount</dt>
                                    <dd className="font-display text-xl text-ink tabular-nums">{formatCurrency(totalAmount, currency)}</dd>
                                </div>
                            </dl>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
