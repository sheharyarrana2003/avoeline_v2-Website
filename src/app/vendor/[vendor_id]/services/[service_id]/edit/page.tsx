// app/vendor/[vendor_id]/services/[service_id]/edit/page.tsx
// Fully Server Component — Edit an existing service.
//
// The services list has always linked here (services/page.tsx "Edit" action) but
// the route didn't exist, so a service could never be changed after creation —
// which is why every service in Firestore still has empty images/videos.
// Mirrors add-service: plain form + inline server action + name-based FormData.

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { AuthService } from "@/src/features/auth/authService";
import { Service, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { MediaUploadField } from "@/src/features/media/MediaUploadField";
import { isVideoUrl } from "@/src/features/media/media.utils";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

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
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
                <PageHeader
                    title="Edit service"
                    description={service.name || "Update pricing, description and media."}
                    actions={
                        <Link href={`/vendor/${vendor_id}/services`} className={buttonClass("secondary")}>
                            Cancel
                        </Link>
                    }
                />

                <form action={updateServiceAction} className="space-y-8">

                    <input type="hidden" name="vendorId" value={vendor_id} />
                    <input type="hidden" name="serviceId" value={service_id} />

                    {/* Service Name & Category */}
                    <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="serviceName" className={labelClass}>Service name</label>
                            <input
                                id="serviceName"
                                type="text"
                                name="serviceName"
                                defaultValue={service.name || ""}
                                placeholder="e.g. Premium Buffet"
                                required
                                className={`${fieldClass} mt-2`}
                            />
                        </div>

                        <div>
                            <label htmlFor="category" className={labelClass}>Category</label>
                            <select
                                id="category"
                                name="category"
                                defaultValue={currentCategory}
                                className={`${fieldClass} mt-2`}
                            >
                                {categoryOptions.map((cat) => (
                                    <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className={labelClass}>Description</label>
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            defaultValue={service.description || ""}
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
                                defaultValue={service.price ?? 0}
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
                                defaultValue={service.minOrder ?? 1}
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
                                        defaultChecked={inclusions.includes(inc.id)}
                                        className="h-4 w-4 rounded-xs border-line-loud accent-gray-900"
                                    />
                                    <span className="text-sm text-ink">{inc.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Service Images & Videos */}
                    <div>
                        <span className={labelClass}>Photos &amp; video</span>
                        <div className="mt-2">
                            <MediaUploadField
                                name="serviceImages"
                                folder="service-images"
                                multiple
                                accept="image/*,video/*"
                                initialUrls={existingMedia}
                                buttonClassName="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-loud text-2xs text-ink-soft transition hover:border-ink disabled:opacity-60"
                            />
                        </div>
                        <p className="mt-2 text-xs text-ink-soft">
                            Shown on your service card and on the organizer&apos;s view of your profile.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 border-t border-line pt-6">
                        <Link href={`/vendor/${vendor_id}/services`} className={buttonClass("ghost")}>
                            Cancel
                        </Link>
                        <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                            Save changes
                        </SubmitButton>
                    </div>
                </form>
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

    // A Server Action is a public endpoint: authorize here, not only in the layout.
    const u = await AuthService.getCurrentUser();
    if (!u || u.userType !== 'vendor' || u.roleId !== vendorId) return;

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
