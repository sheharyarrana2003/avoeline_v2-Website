// app/vendor/[vendor_id]/services/add-service/page.tsx
// Fully Server Component - Add New Service

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { AuthService } from "@/src/features/auth/authService";
import { Service, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/data/admin_db"
import { SubmitButton } from "@/src/shared_components/SubmitButton"
import { MediaUploadField } from "@/src/features/media/MediaUploadField"
import { isVideoUrl } from "@/src/features/media/media.utils"
import AddCategoryButton from "./AddCategorybutton";
import { COLLECTIONS } from "@/data/collections";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

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

export default async function AddNewServicePage({
    params,
    searchParams
}: {
    params: Promise<{ vendor_id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;

    // Fetch vendor data for categories
    const vendor = await EventVendorService.getVendorById(vendor_id);
    if (!vendor) {
        notFound();
    }

    const serviceCategories = vendor?.serviceCategories || [];
    const categoryOptions = getCategoryOptions(serviceCategories);
    const resolvedSearchParams = await searchParams;
    // A vendor with no categories yet had an empty <select> and saved an empty
    // category, which then matched no tab on the services list.
    const addCategory = resolvedSearchParams?.addCategory === 'true' || categoryOptions.length === 0;

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
                <PageHeader
                    title="Add service"
                    description="What you list here is what organizers can request a quote for."
                    actions={
                        <Link href={`/vendor/${vendor_id}/services`} className={buttonClass("secondary")}>
                            Cancel
                        </Link>
                    }
                />

                <form action={createServiceAction} className="space-y-8">

                    <input type="hidden" name="vendorId" value={vendor_id} />
                    <input type="hidden" name="add-category" value={addCategory ? "true" : "false"} />

                    {/* Service Name & Category */}
                    <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="serviceName" className={labelClass}>Service name</label>
                            <input
                                id="serviceName"
                                type="text"
                                name="serviceName"
                                placeholder="e.g. Premium Buffet"
                                required
                                className={`${fieldClass} mt-2`}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor="category" className={labelClass}>Category</label>
                                {categoryOptions.length > 0 && <AddCategoryButton />}
                            </div>

                            {addCategory ? (
                                <input
                                    id="category"
                                    type="text"
                                    name="category"
                                    placeholder="Enter a category…"
                                    required
                                    className={`${fieldClass} mt-2`}
                                />
                            ) : (
                                <select id="category" name="category" className={`${fieldClass} mt-2`}>
                                    {categoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className={labelClass}>Description</label>
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            placeholder="Tell organizers what makes this service worth booking…"
                            className={`${fieldClass} mt-2 resize-none`}
                        />
                    </div>

                    {/* Price & Minimum Order */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="price" className={labelClass}>Price (PKR)</label>
                            <input
                                id="price"
                                type="number"
                                name="price"
                                min={0}
                                placeholder="0"
                                className={`${fieldClass} mt-2 tabular-nums`}
                            />
                        </div>
                        <div>
                            <label htmlFor="minOrder" className={labelClass}>Minimum order</label>
                            <input
                                id="minOrder"
                                type="number"
                                name="minOrder"
                                min={1}
                                placeholder="1"
                                className={`${fieldClass} mt-2 tabular-nums`}
                            />
                        </div>
                    </div>

                    {/* Service Inclusions */}
                    <fieldset>
                        <legend className={labelClass}>Inclusions</legend>
                        <div className="mt-2 divide-y divide-line border-y border-line">
                            {DEFAULT_INCLUSIONS.map((inc) => (
                                <label key={inc.id} className="flex cursor-pointer items-center gap-3 py-3">
                                    <input
                                        type="checkbox"
                                        name="inclusions"
                                        value={inc.id}
                                        defaultChecked={inc.checked}
                                        className="h-4 w-4 rounded-xs border-line-loud accent-gray-900"
                                    />
                                    <span className="text-sm text-ink">{inc.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Service Images */}
                    <div>
                        <span className={labelClass}>Photos &amp; video</span>
                        <div className="mt-2">
                            <MediaUploadField
                                name="serviceImages"
                                folder="service-images"
                                multiple
                                accept="image/*,video/*"
                                buttonClassName="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-loud text-2xs text-ink-soft transition hover:border-ink disabled:opacity-60"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 border-t border-line pt-6">
                        <Link href={`/vendor/${vendor_id}/services`} className={buttonClass("ghost")}>
                            Cancel
                        </Link>
                        <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                            Save service
                        </SubmitButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Server Action

async function createServiceAction(formData: FormData) {
    'use server';

    const vendorId = formData.get('vendorId') as string;

    // A Server Action is a public endpoint: authorize here, not only in the layout.
    const u = await AuthService.getCurrentUser();
    if (!u || u.userType !== 'vendor' || u.roleId !== vendorId) return;

    const serviceName = ((formData.get('serviceName') as string) || "").trim();
    const add_category = formData.get('add-category') as string;

    const serviceMedia = (formData.getAll('serviceImages') as string[]).filter(Boolean);
    // Split by type so each service card can show its own image/video.
    const serviceImageUrls = serviceMedia.filter((u) => !isVideoUrl(u));
    const serviceVideoUrls = serviceMedia.filter((u) => isVideoUrl(u));

    // Trimmed: a stray newline from the custom-category input ("Catering\r\n")
    // breaks the label lookup and every category filter downstream.
    const category = ((formData.get('category') as string) || "").trim();

    const payload: Service = {
        serviceId: crypto.randomUUID(),
        name: serviceName,
        description: ((formData.get('description') as string) || "").trim(),
        category,
        price: parseFloat(formData.get('price') as string) || 0,
        minOrder: parseInt(formData.get('minOrder') as string) || 1,

        // formData.getAll() correctly handles multiple inputs with the same name attribute
        inclusions: formData.getAll('inclusions') as string[],
        // Media stored ON the service — the source of truth for each service card.
        images: serviceImageUrls,
        videos: serviceVideoUrls,
    };

    const vendor: VendorData | null = await EventVendorService.getVendorById(vendorId);

    if (vendor) {
        const serviceCategories = vendor.serviceCategories || [];
        if (add_category === "true" && category && !serviceCategories.includes(category)) {
            // Trimmed here too: an untrimmed value persisted into serviceCategories
            // is then re-served as a <select> option value, reinfecting later writes.
            serviceCategories.push(category);
        }

        const services = [...(vendor.services || []), payload];

        // Also mirror into the vendor's portfolio so the aggregate portfolio
        // galleries still show everything. NOTE: per-service cards read the
        // service's own images/videos (above) — the portfolio array is only an
        // aggregate view, never used for per-service association.
        const portfolio: any = vendor.portfolio || {};
        if (serviceMedia.length) {
            portfolio.images = Array.isArray(portfolio.images) ? portfolio.images : [];
            portfolio.videos = Array.isArray(portfolio.videos) ? portfolio.videos : [];
            for (const url of serviceImageUrls) portfolio.images.push({ url, caption: serviceName });
            for (const url of serviceVideoUrls) portfolio.videos.push(url);
        }

        // Vendor docs are keyed by the auth uid (== vendor.userId), NOT the
        // vendorId field — write to the correct document. Targeted fields rather
        // than a whole-document spread, matching edit and delete: the spread
        // clobbered anything changed since this page rendered.
        const docId = vendor.userId || vendorId;
        await adminDb.collection(COLLECTIONS.VENDORS).doc(docId).update({
            services,
            serviceCategories,
            ...(serviceMedia.length ? { portfolio } : {}),
        });
    }

    // Redirect back to services page
    redirect(`/vendor/${vendorId}/services`);
}
