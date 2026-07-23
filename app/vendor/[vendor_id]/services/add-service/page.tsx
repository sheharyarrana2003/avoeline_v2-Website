// app/vendor/[vendor_id]/services/new/page.tsx
// Fully Server Component - Add New Service

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { PricingPackage, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/data/admin_db"
import { SubmitButton } from "@/src/shared_components/SubmitButton"
import { MediaUploadField } from "@/src/features/media/MediaUploadField"
import { isVideoUrl } from "@/src/features/media/media.utils"

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

                        {/* Service Images */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Service Images</label>
                            <MediaUploadField
                                name="serviceImages"
                                folder="service-images"
                                multiple
                                accept="image/*,video/*"
                                buttonClassName="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-[10px] text-gray-400 transition hover:border-gray-300 disabled:opacity-60"
                            />
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
                            <SubmitButton
                                pendingText="Saving…"
                                className="bg-black text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Save Service
                            </SubmitButton>
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
    const serviceMedia = (formData.getAll('serviceImages') as string[]).filter(Boolean);
    // Split by type so each service card can show its own image/video.
    const serviceImageUrls = serviceMedia.filter((u) => !isVideoUrl(u));
    const serviceVideoUrls = serviceMedia.filter((u) => isVideoUrl(u));

    const payload: PricingPackage = {
        packageId: formData.get('packageId') as string || crypto.randomUUID(), // Generates an ID if not passed from frontend
        name: formData.get('packageName') as string || formData.get('serviceName') as string, // Fallbacks handled gently
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string) || 0,
        minOrder: parseInt(formData.get('minOrder') as string) || 1,

        // formData.getAll() correctly handles multiple inputs with the same name attribute
        inclusions: formData.getAll('inclusions') as string[],
        customizationOptions: formData.getAll('customizations') as string[],

        // Media stored ON the service — the source of truth for each service card.
        images: serviceImageUrls,
        videos: serviceVideoUrls,
    };

    const vendor: VendorData | null = await EventVendorService.getVendorById(vendorId);
    if (vendor) {
        vendor.pricingPackages.push(payload);

        // Also mirror into the vendor's portfolio so the aggregate portfolio
        // galleries still show everything. NOTE: per-service cards read the
        // package's own images/videos (above) — the portfolio array is only an
        // aggregate view, never used for per-service association.
        if (serviceMedia.length) {
            const portfolio: any = vendor.portfolio || {};
            portfolio.images = Array.isArray(portfolio.images) ? portfolio.images : [];
            portfolio.videos = Array.isArray(portfolio.videos) ? portfolio.videos : [];
            for (const url of serviceImageUrls) portfolio.images.push({ url, caption: serviceName });
            for (const url of serviceVideoUrls) portfolio.videos.push(url);
            vendor.portfolio = portfolio;
        }

        // Vendor docs are keyed by the auth uid (== vendor.userId), NOT the
        // vendorId field — write to the correct document.
        const docId = vendor.userId || vendorId;
        await adminDb.collection("vendor").doc(docId).update({ ...vendor });
    }

    // Redirect back to services page
    redirect(`/vendor/${vendorId}/services`);
}