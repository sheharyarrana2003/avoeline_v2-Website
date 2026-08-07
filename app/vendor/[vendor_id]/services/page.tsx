import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { Service, VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

// --- Helper Functions ---
const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

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

const getServiceStatus = (service: any, index: number) => {
    // Mock status logic - first 2 active, rest inactive
    if (index < 2) return { status: 'active', label: 'ACTIVE', color: 'bg-green-500 text-white' };
    return { status: 'inactive', label: 'INACTIVE', color: 'bg-white text-gray-500' };
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
        { id: 'all', label: 'All Services', count: services.length },
        ...serviceCategories.map((cat: string) => ({
            // Trimmed so the tab's href/filter value matches a trimmed service
            // category — legacy values carry a trailing newline.
            id: cat.trim().toLowerCase(),
            label: getCategoryLabel(cat),
            count: getCategoryCount(services, cat),
        })),
    ];

    // Filter services by category
    let displayServices = services;
    if (filter !== 'all') {
        displayServices = services.filter((s: any) => sameCategory(s.category, filter));
    }

    // Add status and metadata to services
    const enrichedServices = displayServices.map((service: any, index: number) => ({
        ...service,
        statusInfo: getServiceStatus(service, index),
    }));

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your professional service catalog, pricing models, and availability status.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/vendor/${vendor_id}/services/add-service`}
                            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                        >
                            <span>+</span> Add New Service
                        </Link>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                    {categoryTabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`/vendor/${vendor_id}/services?filter=${tab.id}`}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition whitespace-nowrap ${filter === tab.id
                                ? 'bg-black text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </Link>
                    ))}
                </div>

                {/* Services Grid */}
                {enrichedServices.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrichedServices.map((service: Service) => {
                            const serviceVideo = service.videos?.[0];
                            const serviceImage = service.images?.[0];

                            return (
                                <div
                                    key={service.serviceId}
                                    className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition
                                        }`}
                                >
                                    {/* Image/Video Header */}
                                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                                        {serviceVideo ? (
                                            <video
                                                src={serviceVideo}
                                                muted
                                                loop
                                                playsInline
                                                className="w-full h-full object-cover"
                                            />
                                        ) : serviceImage ? (
                                            <img
                                                src={serviceImage}
                                                alt={service.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                <span className="text-4xl">🍽️</span>
                                            </div>
                                        )}





                                        {/* Edit/Delete Actions */}
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <Link
                                                href={`/vendor/${vendor_id}/services/${service.serviceId}/edit`}
                                                className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm"
                                            >
                                                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </Link>
                                            <form action={deleteServiceAction} className="inline">
                                                <input type="hidden" name="serviceId" value={service.serviceId} />
                                                <input type="hidden" name="vendorId" value={vendor_id} />
                                                <button
                                                    type="submit"
                                                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm"
                                                >
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5">
                                        {/* Category */}
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            {getCategoryLabel(service.category || 'general')}
                                        </p>

                                        {/* Title */}
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>

                                        {/* Description */}
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                            {service.description}
                                        </p>

                                        {/* Price & Action */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-lg font-bold text-gray-900">{formatCurrency(service.price)}</span>
                                                <span className="text-xs text-gray-400 ml-1">/ {service.minOrder ? `min ${service.minOrder}` : 'unit'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Services Found</h3>
                        <p className="text-sm text-gray-500 mb-4">No services match the selected filter.</p>
                        <Link
                            href={`/vendor/${vendor_id}/services/add-service`}
                            className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
                        >
                            + Add Service
                        </Link>
                    </div>
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

