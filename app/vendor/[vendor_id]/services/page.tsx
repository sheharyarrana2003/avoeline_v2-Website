import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { AuthService } from "@/src/features/auth/authService";
import { Service, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { formatCurrency } from "@/src/lib/money";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { buttonClass } from "@/src/lib/ui";
import { ImageOff, Package, Pencil, Plus, Trash2 } from "lucide-react";

// --- Helper Functions ---
const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
        'catering': 'Catering',
        'event_management': 'Event Management',
        'venues': 'Venues',
        'photography': 'Photography',
        'decor': 'Decoration',
        'music': 'Music',
        'av_equipment': 'AV Equipment',
    };
    // Trimmed: categories written before the add-service trim fix can carry a
    // trailing newline ("Catering\r\n"), which misses every lookup below.
    return labels[category?.trim().toLowerCase()] || category?.trim();
};

const sameCategory = (a?: string, b?: string) =>
    (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

const getCategoryCount = (services: any[], category: string) => {
    return services.filter((s: any) => sameCategory(s.category, category)).length;
};

export default async function VendorServicesPage({
    params,
    searchParams
}: {
    params: Promise<{ vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    // Get filter from URL
    const filter = (awaitedSearchParams?.filter as string) || 'all';

    // Fetch vendor data
    const vendor = await EventVendorService.getVendorById(vendor_id);
    if (!vendor) {
        notFound();
    }

    const services = vendor?.services || [];
    const serviceCategories = vendor?.serviceCategories || [];

    // Build category tabs from vendor's serviceCategories
    const categoryTabs = [
        { id: 'all', label: 'All services', count: services.length },
        ...serviceCategories.map((cat: string) => ({
            // Trimmed so the tab's href/filter value matches a trimmed service
            // category — legacy values carry a trailing newline.
            id: cat.trim().toLowerCase(),
            label: getCategoryLabel(cat),
            count: getCategoryCount(services, cat),
        })),
    ];

    // Filter services by category. The "status" that used to be attached here was
    // `index < 2 ? active : inactive` — a badge computed from list position, not
    // from anything stored — and nothing rendered it anyway.
    const displayServices = filter === 'all'
        ? services
        : services.filter((s: any) => sameCategory(s.category, filter));

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title="Services"
                    description="Your catalogue is what organizers search. Prices and photos are what get you shortlisted."
                    actions={
                        <Link href={`/vendor/${vendor_id}/services/add-service`} className={buttonClass("primary", "lg")}>
                            <Plus size={16} />
                            Add service
                        </Link>
                    }
                />

                {/* The whole vendor document is already in hand on this page and only
                    `services` was read off it. A catalogue screen with no sense of how
                    the catalogue is performing is the definition of bland. */}
                <section className="mb-8 grid grid-cols-2 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4">
                    <MetricTile
                        size="md"
                        label="Services"
                        value={String(services.length)}
                        sublabel={`${serviceCategories.length} categories`}
                    />
                    <MetricTile
                        size="md"
                        label="Bookings"
                        value={String(vendor?.stats?.totalBookings ?? 0)}
                        sublabel={`${vendor?.stats?.completedBookings ?? 0} completed`}
                    />
                    <MetricTile
                        size="md"
                        label="Rating"
                        value={vendor?.ratings?.averageRating ? vendor.ratings.averageRating.toFixed(1) : "—"}
                        sublabel={`${vendor?.ratings?.totalReviews ?? 0} reviews`}
                    />
                    <MetricTile
                        size="md"
                        label="With media"
                        value={String(services.filter((s: Service) => s.images?.length || s.videos?.length).length)}
                        sublabel="Listings with a photo or video"
                    />
                </section>

                <FilterTabs
                    tabs={categoryTabs.map((t) => ({
                        label: t.label,
                        value: t.id,
                        count: t.count,
                        href: `/vendor/${vendor_id}/services?filter=${t.id}`,
                    }))}
                    activeValue={filter}
                    label="Filter by category"
                />

                {displayServices.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayServices.map((service: Service) => {
                            const serviceVideo = service.videos?.[0];
                            const serviceImage = service.images?.[0];

                            return (
                                <div
                                    key={service.serviceId}
                                    className="lift overflow-hidden rounded-2xl border border-line bg-paper shadow-xs"
                                >
                                    {/* Image/Video Header */}
                                    <div className="relative h-48 overflow-hidden bg-muted">
                                        {serviceVideo ? (
                                            <video
                                                src={serviceVideo}
                                                muted
                                                loop
                                                playsInline
                                                className="h-full w-full object-cover"
                                            />
                                        ) : serviceImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={serviceImage}
                                                alt={service.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-ink-faint">
                                                {/* gray-400 = 2.5:1: decoration inside an aria-hidden
                                                    placeholder, never the only carrier of meaning. */}
                                                <ImageOff size={28} aria-hidden="true" />
                                            </div>
                                        )}

                                        {/* Edit/Delete Actions */}
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <Link
                                                href={`/vendor/${vendor_id}/services/${service.serviceId}/edit`}
                                                aria-label={`Edit ${service.name}`}
                                                className={buttonClass("secondary", "sm", "px-2")}
                                            >
                                                <Pencil size={14} aria-hidden="true" />
                                            </Link>
                                            <form action={deleteServiceAction} className="inline">
                                                <input type="hidden" name="serviceId" value={service.serviceId} />
                                                <input type="hidden" name="vendorId" value={vendor_id} />
                                                <ConfirmSubmit
                                                    title="Delete this service?"
                                                    description={`"${service.name}" will be permanently removed from your profile. Organizers browsing the marketplace will no longer see it. This cannot be undone.`}
                                                    confirmLabel="Delete service"
                                                    className={buttonClass("destructive", "sm", "px-2")}
                                                >
                                                    <span className="sr-only">Delete {service.name}</span>
                                                    <Trash2 size={14} aria-hidden="true" />
                                                </ConfirmSubmit>
                                            </form>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5">
                                        <p className="text-2xs font-medium uppercase text-ink-soft">
                                            {getCategoryLabel(service.category || 'general')}
                                        </p>

                                        <h2 className="mt-2 font-display text-lg text-ink">{service.name}</h2>

                                        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                                            {service.description || "No description yet."}
                                        </p>

                                        {/* inclusions is stored on every service and was
                                            rendered on no screen in the product — it is
                                            the part an organizer actually compares. */}
                                        {service.inclusions?.length ? (
                                            <ul className="mt-3 flex flex-wrap gap-1.5">
                                                {service.inclusions.slice(0, 3).map((inc: string) => (
                                                    <li
                                                        key={inc}
                                                        className="rounded-full border border-line bg-muted px-2 py-0.5 text-2xs text-ink-soft"
                                                    >
                                                        {inc}
                                                    </li>
                                                ))}
                                                {service.inclusions.length > 3 ? (
                                                    <li className="px-1 py-0.5 text-2xs text-ink-faint">
                                                        +{service.inclusions.length - 3} more
                                                    </li>
                                                ) : null}
                                            </ul>
                                        ) : null}

                                        <p className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm text-ink-soft">
                                            <span>
                                                <span className="font-medium text-ink tabular-nums">{formatCurrency(service.price)}</span>
                                                <span className="tabular-nums"> / {service.minOrder ? `min ${service.minOrder}` : 'unit'}</span>
                                            </span>
                                            {(service.images?.length ?? 0) + (service.videos?.length ?? 0) > 0 ? (
                                                <span className="shrink-0 text-2xs text-ink-faint tabular-nums">
                                                    {(service.images?.length ?? 0) + (service.videos?.length ?? 0)} media
                                                </span>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<Package size={26} />}
                        title={filter === 'all' ? "No services yet" : "Nothing in this category"}
                        description={
                            filter === 'all'
                                ? "Organizers can't request a quote for a service you haven't listed. Add your first one to start receiving requests."
                                : "Try another category, or add a service under this one."
                        }
                        action={
                            <Link href={`/vendor/${vendor_id}/services/add-service`} className={buttonClass("primary")}>
                                <Plus size={16} />
                                Add service
                            </Link>
                        }
                    />
                )}
            </div>
        </div>
    );
}

// Server Actions
async function deleteServiceAction(formData: FormData) {
    'use server';
    const serviceId = formData.get('serviceId') as string;
    const vendorId = formData.get('vendorId') as string;

    // A Server Action is a public endpoint, so the layout guard is not enough:
    // without this, any signed-in user could POST another vendor's id and delete
    // their catalogue.
    const u = await AuthService.getCurrentUser();
    if (!u || u.userType !== 'vendor' || u.roleId !== vendorId) return;

    const vendor: VendorData | null = await EventVendorService.getVendorById(vendorId);

    if (vendor) {
        const services = (vendor.services || []).filter(s => s.serviceId !== serviceId);

        // Vendor docs are keyed by the auth uid (== vendor.userId), not the vendorId
        // field getVendorById queries on — doc(vendorId) targeted a document that
        // doesn't exist, so deletes silently did nothing. Targeted field write, to
        // match add/edit and avoid a whole-document spread.
        const docId = vendor.userId || vendorId;
        await adminDb.collection(COLLECTIONS.VENDORS).doc(docId).update({ services });
        revalidatePath(`/vendor/${vendorId}/services`);
    }
}
