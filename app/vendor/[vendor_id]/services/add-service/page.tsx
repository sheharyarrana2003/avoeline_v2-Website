// app/vendor/[vendor_id]/services/new/page.tsx
// Fully Server Component - Add New Service

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { PricingPackage, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/data/db'

// Helper to get category options from vendor
const getCategoryOptions = (categories: string[]) => {
    const labels: Record<string, string> = {
        'catering': 'Catering',
        'event_management': 'Event Management',
        'venues': 'Venues',
        'photography': 'Photography',
        'decor': 'Decoration',
        'music': 'Music',
        'av_equipment': 'AV Equipment',
    };
    return categories.map(cat => ({
        value: cat,
        label: labels[cat?.toLowerCase()] || cat,
    }));
};

// Predefined inclusions for catering
const DEFAULT_INCLUSIONS = [
    { id: 'staffing', label: 'Professional Staffing', checked: true },
    { id: 'crockery', label: 'Premium Crockery', checked: true },
    { id: 'beverage', label: 'Beverage Station', checked: false },
    { id: 'cleanup', label: 'Post-Event Cleanup', checked: false },
    { id: 'custom_menu', label: 'Custom Menu Design', checked: false },
    { id: 'tasting', label: 'Pre-Event Tasting', checked: false },
];

// Pricing model options
const PRICING_MODELS = [
    { id: 'per_person', label: 'Per Person' },
    { id: 'fixed_price', label: 'Fixed Price' },
    { id: 'quote_required', label: 'Quote Required' },
];

export default async function AddNewServicePage({
    params
}: {
    params: Promise<{ vendor_id: string }>
}) {
    const { vendor_id } = await params;

    // Fetch vendor data for categories
    const vendor = await EventVendorService.getVendorById(vendor_id);
    if (!vendor) {
        notFound();
    }

    const serviceCategories = vendor?.serviceCategories || [];
    const categoryOptions = getCategoryOptions(serviceCategories);
    const businessName = vendor?.businessName || "Vendor";

    return (
        <div className="min-h-screen bg-[#f5f5f5]">

        
            <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href={`/vendor/${vendor_id}/services`} className="hover:text-gray-700">Services</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Add New Service</span>
                </div>

                {/* Modal-like Card */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-xl font-bold text-gray-900">Add New Service</h1>
                        <Link
                            href={`/vendor/${vendor_id}/services`}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Link>
                    </div>

                    {/* Form */}
                    <form action={createServiceAction} className="space-y-6">
                        <input type="hidden" name="vendorId" value={vendor_id} />

                        {/* Service Name & Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                                <input
                                    type="text"
                                    name="serviceName"
                                    placeholder="e.g. Premium Buffet"
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <div className="relative">
                                    <select
                                        name="category"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200"
                                    >
                                        {categoryOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <span className="text-xs text-gray-400">0/500</span>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                                    <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs font-bold">B</button>
                                    <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs italic">I</button>
                                    <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs">≡</button>
                                </div>
                                <textarea
                                    name="description"
                                    rows={4}
                                    placeholder="Tell clients what makes this service special..."
                                    className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Pricing Model */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Pricing Model</label>
                            <div className="flex gap-3">
                                {PRICING_MODELS.map((model) => (
                                    <label key={model.id} className="flex-1">
                                        <input
                                            type="radio"
                                            name="pricingModel"
                                            value={model.id}
                                            defaultChecked={model.id === 'per_person'}
                                            className="peer sr-only"
                                        />
                                        <div className="text-center py-3 px-4 rounded-xl border-2 border-gray-200 text-sm text-gray-600 cursor-pointer peer-checked:border-black peer-checked:text-black peer-checked:bg-gray-50 transition">
                                            {model.label}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Price Input (conditional based on pricing model) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">PKR</span>
                                    <input
                                        type="number"
                                        name="price"
                                        placeholder="0"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order</label>
                                <input
                                    type="number"
                                    name="minOrder"
                                    placeholder="1"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                        </div>

                        {/* Service Inclusions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Service Inclusions</label>
                            <div className="space-y-2">
                                {DEFAULT_INCLUSIONS.map((inc) => (
                                    <label key={inc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                        <input
                                            type="checkbox"
                                            name="inclusions"
                                            value={inc.id}
                                            defaultChecked={inc.checked}
                                            className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                        />
                                        <span className="text-sm text-gray-700">{inc.label}</span>
                                    </label>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="mt-3 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                            >
                                <span className="text-lg">+</span> Add Custom Inclusion
                            </button>
                        </div>

                        {/* Customization Options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Customization Options</label>
                            <div className="flex flex-wrap gap-2">
                                {['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Nut-Free', 'Spice Level'].map((opt) => (
                                    <label key={opt} className="cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="customizations"
                                            value={opt.toLowerCase().replace(' ', '_')}
                                            className="peer sr-only"
                                        />
                                        <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 peer-checked:bg-black peer-checked:text-white peer-checked:border-black transition">
                                            {opt}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Service Images */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Service Images</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 transition">
                                    <svg className="w-6 h-6 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] text-gray-400">Upload</span>
                                </div>

                                {/* Mock uploaded images */}
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200">
                                    <div className="w-full h-full bg-gradient-to-br from-orange-200 to-red-300" />
                                </div>
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200">
                                    <div className="w-full h-full bg-gradient-to-br from-amber-700 to-amber-900" />
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                            <textarea
                                name="terms"
                                rows={3}
                                placeholder="Cancellation policy, payment terms..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link
                                href={`/vendor/${vendor_id}/services`}
                                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                className="bg-black text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
                            >
                                Save Service
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Server Action
async function createServiceAction(formData: FormData) {
    'use server';

    const vendorId = formData.get('vendorId') as string;
    const serviceName = formData.get('serviceName') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const pricingModel = formData.get('pricingModel') as string;
    const price = parseFloat(formData.get('price') as string) || 0;
    const minOrder = parseInt(formData.get('minOrder') as string) || 1;
    const terms = formData.get('terms') as string;

    const inclusions = formData.getAll('inclusions') as string[];
    const customizations = formData.getAll('customizations') as string[];

    const payload: PricingPackage = {
        packageId: formData.get('packageId') as string || crypto.randomUUID(), // Generates an ID if not passed from frontend
        name: formData.get('packageName') as string || formData.get('serviceName') as string, // Fallbacks handled gently
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string) || 0,
        minOrder: parseInt(formData.get('minOrder') as string) || 1,

        // formData.getAll() correctly handles multiple inputs with the same name attribute
        inclusions: formData.getAll('inclusions') as string[],
        customizationOptions: formData.getAll('customizations') as string[],
    };

    const vendor: VendorData | null = await EventVendorService.getVendorById(vendorId);
    vendor?.pricingPackages.push(payload);

    const docRef = doc(db, "vendor",vendorId);
    await setDoc(docRef,{...vendor})

    // Redirect back to services page
    redirect(`/vendor/${vendorId}/services`);
}