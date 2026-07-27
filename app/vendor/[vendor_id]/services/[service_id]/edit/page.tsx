// app/vendor/[vendor_id]/services/[service_id]/edit/page.tsx
// Fully Server Component — Edit an existing service.
//
// The services list has always linked here (services/page.tsx "Edit" action) but
// the route didn't exist, so a service could never be changed after creation —
// which is why every service in Firestore still has empty images/videos.
// Mirrors add-service: plain form + inline server action + name-based FormData.

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { Service, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { MediaUploadField } from "@/src/features/media/MediaUploadField";
import { isVideoUrl } from "@/src/features/media/media.utils";

const CATEGORY_LABELS: Record<string, string> = {
    catering: "Catering",
    event_management: "Event Management",
    venues: "Venues",
    photography: "Photography",
    decor: "Decoration",
    decoration: "Decoration",
    music: "Music",
    av_equipment: "AV Equipment",
};

// Categories stored before the trim fix can carry trailing newlines, so compare
// and label on the trimmed value.
const categoryLabel = (cat: string) => CATEGORY_LABELS[cat?.trim().toLowerCase()] || cat?.trim();

const DEFAULT_INCLUSIONS = [
    { id: "staffing", label: "Professional Staffing" },
    { id: "crockery", label: "Premium Crockery" },
    { id: "beverage", label: "Beverage Station" },
    { id: "cleanup", label: "Post-Event Cleanup" },
    { id: "custom_menu", label: "Custom Menu Design" },
    { id: "tasting", label: "Pre-Event Tasting" },
];

export default async function EditServicePage({
    params,
}: {
    params: Promise<{ vendor_id: string; service_id: string }>;
}) {
    const { vendor_id, service_id } = await params;

    const vendor = await EventVendorService.getVendorById(vendor_id);
    if (!vendor) notFound();

    const service = (vendor.services || []).find((s) => s.serviceId === service_id);
    if (!service) notFound();

    const categories = (vendor.serviceCategories || []).map((c) => c.trim()).filter(Boolean);
    // Keep the service's own category selectable even if it isn't in the vendor's list.
    const currentCategory = (service.category || "").trim();
    const categoryOptions = Array.from(new Set([...categories, currentCategory].filter(Boolean)));

    const existingMedia = [...(service.images || []), ...(service.videos || [])];
    const inclusions = service.inclusions || [];

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href={`/vendor/${vendor_id}/services`} className="hover:text-gray-700">Services</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{service.name || "Edit Service"}</span>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-xl font-bold text-gray-900">Edit Service</h1>
                        <Link
                            href={`/vendor/${vendor_id}/services`}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Link>
                    </div>

                    <form action={updateServiceAction} className="space-y-6">

                        <input type="hidden" name="vendorId" value={vendor_id} />
                        <input type="hidden" name="serviceId" value={service_id} />

                        {/* Service Name & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-gray-900 leading-none h-4 flex items-center">
                                    Service Name
                                </label>
                                <input
                                    type="text"
                                    name="serviceName"
                                    defaultValue={service.name || ""}
                                    placeholder="e.g. Premium Buffet"
                                    required
                                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-gray-900 leading-none h-4 flex items-center">
                                    Category
                                </label>
                                <div className="relative w-full">
                                    <select
                                        name="category"
                                        defaultValue={currentCategory}
                                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 pr-10 text-sm text-gray-900 appearance-none outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition cursor-pointer"
                                    >
                                        {categoryOptions.map((cat) => (
                                            <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                                        ))}
                                    </select>
                                    <svg className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <textarea
                                    name="description"
                                    rows={4}
                                    defaultValue={service.description || ""}
                                    placeholder="Tell clients what makes this service special..."
                                    className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Price & Minimum Order */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">PKR</span>
                                    <input
                                        type="number"
                                        name="price"
                                        defaultValue={service.price ?? 0}
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
                                    defaultValue={service.minOrder ?? 1}
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
                                            defaultChecked={inclusions.includes(inc.id)}
                                            className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                        />
                                        <span className="text-sm text-gray-700">{inc.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Service Images & Videos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Service Images &amp; Videos</label>
                            <MediaUploadField
                                name="serviceImages"
                                folder="service-images"
                                multiple
                                accept="image/*,video/*"
                                initialUrls={existingMedia}
                                buttonClassName="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-[10px] text-gray-400 transition hover:border-gray-300 disabled:opacity-60"
                            />
                            <p className="mt-2 text-xs text-gray-400">
                                Shown on your service card and on the organizer&apos;s view of your profile.
                            </p>
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
                                Save Changes
                            </SubmitButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Server Action

async function updateServiceAction(formData: FormData) {
    'use server';

    const vendorId = formData.get('vendorId') as string;
    const serviceId = formData.get('serviceId') as string;
    if (!vendorId || !serviceId) return;

    const vendor: VendorData | null = await EventVendorService.getVendorById(vendorId);
    if (!vendor) return;

    const services = vendor.services || [];
    const index = services.findIndex((s) => s.serviceId === serviceId);
    if (index === -1) return;

    // Existing URLs come back through the hidden inputs, so this is the full set
    // after any removals in the picker — split by type the same way add-service does.
    const media = (formData.getAll('serviceImages') as string[]).filter(Boolean);

    const updated: Service = {
        ...services[index],
        serviceId,
        name: ((formData.get('serviceName') as string) || services[index].name || "").trim(),
        description: ((formData.get('description') as string) || "").trim(),
        // Trimmed: untrimmed values ("Catering\r\n") break the category label
        // lookup and every tab/marketplace filter that compares lowercased text.
        category: ((formData.get('category') as string) || "").trim(),
        price: parseFloat(formData.get('price') as string) || 0,
        minOrder: parseInt(formData.get('minOrder') as string) || 1,
        inclusions: formData.getAll('inclusions') as string[],
        images: media.filter((u) => !isVideoUrl(u)),
        videos: media.filter((u) => isVideoUrl(u)),
    };

    services[index] = updated;

    // Targeted field write rather than update({...vendor}): a whole-document spread
    // would clobber anything else changed since this page rendered. Vendor docs are
    // keyed by the auth uid (== vendor.userId), not the vendorId field.
    const docId = vendor.userId || vendorId;
    await adminDb.collection(COLLECTIONS.VENDORS).doc(docId).update({ services });

    redirect(`/vendor/${vendorId}/services`);
}
