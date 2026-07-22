
'use client';

import { useState, useTransition } from 'react';
import Link from "next/link";
import { formatDate, formatTime } from "@/src/lib/datetime";

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
    type: 'pdf' | 'zip' | 'image';
}

interface InitialData {
    bookingId: string;
    eventId: string;
    eventTitle: string;
    organizerId: string;
    organizerName: string;
    requirements: {
        description: string;
        serviceDate: string;
        startTime: string;
        endTime: string;
        location: string;
        guestCount: number;
        specialInstructions: string;
    };
    existingQuote: {
        basePrice: number;
        additionalCharges: { description: string; amount: number }[];
        discount: number;
        totalAmount: number;
        breakdown: { item: string; quantity: number; unitPrice: number; total: number }[];
        terms: string;
        validity: string;
    } | null;
    currency: string;
    communications: any[];
    documents: any;
}

// --- Helper Functions ---
const formatCurrency = (amount: number, currency: string = "PKR") => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount || 0);
};

export default function PrepareQuoteClient({
    vendorId, 
    initialData,
    handling_prep_quote
}: { 
    vendorId: string; 
    initialData: InitialData ,
    handling_prep_quote : any
}) {
    const { requirements, existingQuote, currency, eventTitle, organizerName, bookingId } = initialData;

    // --- State ---
    const [servicePackage, setServicePackage] = useState("Custom Quote (Standard)");
    const [saveAsPackage, setSaveAsPackage] = useState(false);
    
    // Initialize items from existing quote or empty
    const [items, setItems] = useState<QuoteItem[]>([]);
    
    const [taxRate, setTaxRate] = useState(15);
    const [discountAmount, setDiscountAmount] = useState(existingQuote?.discount || 0);
    const [platformFeePercent] = useState(2.5);
    
    const [customizations, setCustomizations] = useState<CustomizationOption[]>([]);
    const [customNotes, setCustomNotes] = useState("");
    
    const [terms, setTerms] = useState(existingQuote?.terms);
    
    const [validityDate, setValidityDate] = useState(() => {
        // The <input type="date"> needs an ISO yyyy-mm-dd value. Stored validity
        // may be DD/MM/YYYY (new) or ISO (legacy) — convert without new Date()
        // on a DD/MM string (which would be Invalid Date and throw on toISOString).
        const raw = existingQuote?.validity;
        if (raw) {
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
            const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date.toISOString().split('T')[0];
    });
    
    const [internalNotes, setInternalNotes] = useState("");
    
    const [supportingDocs, setSupportingDocs] = useState<SupportingDoc[]>([    ]);

    // --- Computed Values ---
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = Math.round(subtotal * (taxRate / 100));
    const platformFee = Math.round((subtotal + tax - discountAmount) * (platformFeePercent / 100));
    const totalAmount = subtotal + tax - discountAmount + platformFee;

    // --- Handlers ---
    const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const addLineItem = () => {
        const newItem: QuoteItem = {
            id: Date.now().toString(),
            description: 'New Item',
            quantity: 1,
            unitPrice: 0,
        };
        setItems(prev => [...prev, newItem]);
    };

    const toggleCustomization = (id: string) => {
        setCustomizations(prev => prev.map(opt => 
            opt.id === id ? { ...opt, selected: !opt.selected } : opt
        ));
    };

    const addCustomization = () => {
        if (customNotes.trim()) {
            setCustomizations(prev => [...prev, {
                id: Date.now().toString(),
                label: customNotes.trim(),
                selected: true,
            }]);
            setCustomNotes("");
        }
    };

    const removeDoc = (id: string) => {
        setSupportingDocs(prev => prev.filter(d => d.id !== id));
    };

    const [isSubmitting, startSubmitting] = useTransition();

    const handleSubmit = () => {
        if (isSubmitting) return; // guard against duplicate submissions
        const payload = {
            bookingId,
            vendorId,
            servicePackage,
            items: items.map(({ id, ...rest }) => rest),
            taxRate,
            discountAmount,
            customizations: customizations.filter(c => c.selected).map(c => c.label),
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

    const handleSaveDraft = () => {
        alert("Quote saved as draft.");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Prepare Quote</h1>
                        <p className="text-[10px] text-gray-400">{eventTitle} • Request from {organizerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleSaveDraft}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Save as Draft
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            className="bg-black text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting…' : 'Prepare Quote'}
                        </button>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {organizerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Quote Builder */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Service Package */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <h3 className="text-sm font-bold text-gray-900">Service Package</h3>
                            </div>
                            
                            <div className="relative mb-4">
                                <select
                                    value={servicePackage}
                                    onChange={(e) => setServicePackage(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200"
                                >
                                    <option>Custom Quote (Standard)</option>
                                    <option>Premium Package</option>
                                    <option>Basic Package</option>
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={saveAsPackage}
                                    onChange={(e) => setSaveAsPackage(e.target.checked)}
                                    className="rounded"
                                />
                                Save Current as New Package
                            </label>
                        </div>

                        {/* Itemized Pricing */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <h3 className="text-sm font-bold text-gray-900">Itemized Pricing</h3>
                                </div>
                                <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Import CSV
                                </button>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <div className="col-span-5">Description</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2 text-center">Unit Price</div>
                                <div className="col-span-2 text-right">Total</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Table Rows */}
                            {items.map((item) => {
                                const total = item.quantity * item.unitPrice;
                                return (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-50 items-center">
                                        <div className="col-span-5">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                className="w-full bg-transparent text-sm text-gray-900 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                className="w-full text-center bg-gray-50 rounded-lg py-1.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                                                className="w-full text-center bg-gray-50 rounded-lg py-1.5 text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(total, currency).replace('PKR', '')}</span>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <button 
                                                onClick={() => removeItem(item.id)}
                                                className="text-gray-300 hover:text-red-500 transition"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <button 
                                onClick={addLineItem}
                                className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:border-gray-300 hover:text-gray-600 transition flex items-center justify-center gap-2"
                            >
                                <span>+</span> Add Line Item
                            </button>
                        </div>

                        {/* Tax & Discount */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tax Rate (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Discount Amount (PKR)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">PKR</span>
                                </div>
                            </div>
                        </div>

                        {/* Customisation Options */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                <h3 className="text-sm font-bold text-gray-900">Customisation Options</h3>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                {customizations.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => toggleCustomization(opt.id)}
                                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                                            opt.selected
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customNotes}
                                    onChange={(e) => setCustomNotes(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addCustomization()}
                                    placeholder="Add specific customisation notes here..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                                <button 
                                    onClick={addCustomization}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-sm font-bold text-gray-900">Terms & Conditions</h3>
                            </div>
                            
                            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                                    <button className="p-1 hover:bg-gray-200 rounded text-xs font-bold">B</button>
                                    <button className="p-1 hover:bg-gray-200 rounded text-xs italic">I</button>
                                    <button className="p-1 hover:bg-gray-200 rounded text-xs">≡</button>
                                </div>
                                <textarea
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 text-sm text-gray-700 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Validity & Internal Notes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quote Valid Until</label>
                                <input
                                    type="date"
                                    value={validityDate}
                                    onChange={(e) => setValidityDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Internal Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={internalNotes}
                                    onChange={(e) => setInternalNotes(e.target.value)}
                                    placeholder="Only visible to your team..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Summary & Original Request */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* Original Request */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Original Request</h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Event Date & Time</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatDate(requirements.serviceDate)}, {formatTime(requirements.startTime)} - {formatTime(requirements.endTime)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Guests</p>
                                    <p className="text-sm font-semibold text-gray-900">{requirements.guestCount} People</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Location</p>
                                    <p className="text-sm font-semibold text-gray-900">{requirements.location || 'TBD'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Attachments</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        <span className="text-xs text-gray-600">event_brief.pdf</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quote Summary */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Quote Summary</h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Subtotal</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(subtotal, currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Tax ({taxRate}%)</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(tax, currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Discount</span>
                                    <span className="text-sm font-semibold text-green-600">-{formatCurrency(discountAmount, currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Platform Fee ({platformFeePercent}%)</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(platformFee, currency)}</span>
                                </div>
                                
                                <div className="border-t border-gray-100 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-900">Total Amount</span>
                                        <span className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount, currency)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Payment Terms</p>
                                <p className="text-sm text-gray-600">Net 30 Days</p>
                            </div>
                        </div>

                        {/* Supporting Documents */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Supporting Documents</h3>
                            
                            <div className="space-y-3">
                                {supportingDocs.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                                                <span className="text-xs">
                                                    {doc.type === 'pdf' ? '📄' : doc.type === 'zip' ? '📦' : '📎'}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{doc.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => removeDoc(doc.id)}
                                            className="text-gray-300 hover:text-red-500 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                
                                <button className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-gray-300 hover:text-gray-600 transition flex items-center justify-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Upload New Document
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleSaveDraft}
                                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save as Draft
                            </button>
                            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save as Template
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">Total: <span className="font-bold text-gray-900">{formatCurrency(totalAmount, currency)}</span></span>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                                className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Submitting…' : 'Submit Quote'}
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