"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { formatDate, formatTime } from "@/src/lib/datetime";
import {
    Documents,
} from "@/src/features/bookings/types";
// --- Types ---

interface QuoteItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

interface CustomizationOption {
    id: string;
    label: string;
    selected: boolean;
}

interface SupportingDoc {
    id: string;
    name: string;
    type: "pdf" | "zip" | "image";
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
    documents:Documents;
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
const formatCurrency = (amount: number, currency: string = "PKR"): string => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount || 0);
};

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
        status,
    } = initialData;

    // --- State ---
    const [servicePackage, setServicePackage] = useState<string>(
        vendorServices.length > 0
            ? vendorServices[0].name
            : "Custom Quote"
    );
    const [saveAsPackage, setSaveAsPackage] = useState<boolean>(false);

    // Initialize items from existing quote or empty
    const [items, setItems] = useState<QuoteItem[]>(
        extractItemsFromExistingQuote(existingQuote)
    );

    const [taxRate, setTaxRate] = useState<number>(15);
    const [discountAmount, setDiscountAmount] = useState<number>(
        existingQuote?.discount || 0
    );
    const [platformFeePercent] = useState<number>(2.5);

    const [customizations, setCustomizations] = useState<CustomizationOption[]>(
        []
    );
    const [customNotes, setCustomNotes] = useState<string>("");

    const [terms, setTerms] = useState<string>(existingQuote?.terms || "");

    const [validityDate, setValidityDate] = useState<string>(
        parseValidityDate(existingQuote?.validity)
    );

    const [internalNotes, setInternalNotes] = useState<string>("");

    const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>([]);

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
        const newItem: QuoteItem = {
            id: `item-${Date.now()}`,
            description: "New Item",
            quantity: 1,
            unitPrice: 0,
        };
        setItems((prev) => [...prev, newItem]);
    };

    const toggleCustomization = (id: string): void => {
        setCustomizations((prev) =>
            prev.map((opt) =>
                opt.id === id ? { ...opt, selected: !opt.selected } : opt
            )
        );
    };

    const addCustomization = (): void => {
        if (customNotes.trim()) {
            setCustomizations((prev) => [
                ...prev,
                {
                    id: `custom-${Date.now()}`,
                    label: customNotes.trim(),
                    selected: true,
                },
            ]);
            setCustomNotes("");
        }
    };

    const removeDoc = (id: string): void => {
        setSupportingDocs((prev) => prev.filter((d) => d.id !== id));
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
            customizations: customizations
                .filter((c) => c.selected)
                .map((c) => c.label),
            terms,
            validityDate,
            internalNotes,
            totalAmount,
            currency,
        };

        startSubmitting(async () => {
            await handling_prep_quote(payload);
        });
    };

    const handleSaveDraft = (): void => {
        alert("Quote saved as draft.");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Navigation */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            Prepare Quote
                        </h1>
                        <p className="text-xs text-slate-400">
                            {eventDetails.title} • Request from {organizerName}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Submitting…" : "Prepare Quote"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Quote Builder */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Service Package */}
                        <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-900/5">
                            <div className="flex items-center gap-2 mb-4">
                                <svg
                                    className="w-4 h-4 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                </svg>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Service Package
                                </h3>
                            </div>

                            <div className="relative mb-4">
                                <select
                                    value={servicePackage}
                                    onChange={(e) =>
                                        setServicePackage(e.target.value)
                                    }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 appearance-none outline-none focus:ring-2 focus:ring-slate-200"
                                >
                                    {vendorServices.length > 0 ? (
                                        vendorServices.map((service) => (
                                            <option
                                                key={service.id}
                                                value={service.name}
                                            >
                                                {service.name} —{" "}
                                                {formatCurrency(
                                                    service.basePrice,
                                                    currency
                                                )}
                                            </option>
                                        ))
                                    ) : (
                                        <option>Custom Quote</option>
                                    )}
                                </select>
                                <svg
                                    className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Itemized Pricing */}
                        <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-900/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <svg
                                        className="w-4 h-4 text-slate-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Itemized Pricing
                                    </h3>
                                </div>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                <div className="col-span-5">Description</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2 text-center">
                                    Unit Price
                                </div>
                                <div className="col-span-2 text-right">Total</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Table Rows */}
                            {items.map((item) => {
                                const total = item.quantity * item.unitPrice;
                                return (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 items-center"
                                    >
                                        <div className="col-span-5">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "description",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "quantity",
                                                        parseInt(e.target.value) ||
                                                            0
                                                    )
                                                }
                                                className="w-full text-center bg-slate-50 rounded-lg py-1.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "unitPrice",
                                                        parseInt(e.target.value) ||
                                                            0
                                                    )
                                                }
                                                className="w-full text-center bg-slate-50 rounded-lg py-1.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className="text-sm font-semibold text-slate-900">
                                                {formatCurrency(
                                                    total,
                                                    currency
                                                ).replace(currency, "")}
                                            </span>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <button
                                                onClick={() =>
                                                    removeItem(item.id)
                                                }
                                                className="text-slate-300 hover:text-red-500 transition"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                onClick={addLineItem}
                                className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:border-slate-300 hover:text-slate-600 transition flex items-center justify-center gap-2"
                            >
                                <span>+</span> Add Line Item
                            </button>
                        </div>

                        {/* Tax & Discount */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-slate-900/5">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                                    Tax Rate (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) =>
                                            setTaxRate(
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                        %
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl p-5 shadow-sm ring-1 ring-slate-900/5">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                                    Discount Amount ({currency})
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={discountAmount}
                                        onChange={(e) =>
                                            setDiscountAmount(
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 pr-12"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                        {currency}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-900/5">
                            <div className="flex items-center gap-2 mb-4">
                                <svg
                                    className="w-4 h-4 text-slate-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Terms & Conditions
                                </h3>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                                    <button className="p-1 hover:bg-slate-200 rounded text-xs font-bold">
                                        B
                                    </button>
                                    <button className="p-1 hover:bg-slate-200 rounded text-xs italic">
                                        I
                                    </button>
                                    <button className="p-1 hover:bg-slate-200 rounded text-xs">
                                        ≡
                                    </button>
                                </div>
                                <textarea
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 text-sm text-slate-700 outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Summary & Original Request */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Original Request */}
                        <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-900/5">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                                Original Request
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest">
                                        Event Date & Time
                                    </p>
                                    <p className="text-sm font-medium text-slate-900">
                                        {eventDetails.date ? formatDate(eventDetails.date) : "Not specified"}
                                        {eventDetails.date && eventDetails.fromEvent?.date && (
                                            <span className="text-xs font-normal text-slate-400"> (event date)</span>
                                        )}
                                        {eventDetails.startTime && (
                                            <>
                                                {", "}
                                                {formatTime(eventDetails.startTime)}
                                                {eventDetails.endTime ? ` - ${formatTime(eventDetails.endTime)}` : ""}
                                                {(eventDetails.fromEvent?.startTime || eventDetails.fromEvent?.endTime) && (
                                                    <span className="text-xs font-normal text-slate-400"> (event schedule)</span>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest">
                                        Guests
                                    </p>
                                    <p className="text-sm font-medium text-slate-900">
                                        {(eventDetails.guestCount || requirements.guestCount)
                                            ? `${eventDetails.guestCount || requirements.guestCount} People`
                                            : "Not specified"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest">
                                        Location
                                    </p>
                                    <p className="text-sm font-medium text-slate-900">
                                        {eventDetails.location || requirements.location || "Not specified"}
                                        {eventDetails.location && eventDetails.fromEvent?.location && (
                                            <span className="text-xs font-normal text-slate-400"> (event venue)</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quote Summary */}
                        <div className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-900/5 sticky top-24">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                                Quote Summary
                            </h3>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Subtotal
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {formatCurrency(subtotal, currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Tax ({taxRate}%)
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {formatCurrency(tax, currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Discount
                                    </span>
                                    <span className="text-sm font-semibold text-emerald-600">
                                        -
                                        {formatCurrency(discountAmount, currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Platform Fee ({platformFeePercent}%)
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                        {formatCurrency(platformFee, currency)}
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-900">
                                            Total Amount
                                        </span>
                                        <span className="text-xl font-bold text-slate-900">
                                            {formatCurrency(totalAmount, currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                                    Payment Terms
                                </p>
                                <p className="text-sm text-slate-600">
                                    Net 30 Days
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">
                                Total:{" "}
                                <span className="font-bold text-slate-900">
                                    {formatCurrency(totalAmount, currency)}
                                </span>
                            </span>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Submitting…" : "Submit Quote"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Spacer for fixed bottom bar */}
                <div className="h-20" />
            </div>
        </div>
    );
}