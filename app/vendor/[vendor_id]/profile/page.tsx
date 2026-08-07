// app/vendor/[vendor_id]/profile/page.tsx
// Fully Server Component

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { VendorLogoUpload } from "@/src/features/event_vendors/components/VendorLogoUpload";
import { VendorCoverUpload } from "@/src/features/event_vendors/components/VendorCoverUpload";
import { PortfolioImageManager } from "@/src/features/event_vendors/components/PortfolioImageManager";
import { PortfolioVideoManager } from "@/src/features/event_vendors/components/PortfolioVideoManager";
import { FeedbackService } from "@/src/services/feedback.service";
import { formatDate } from "@/src/lib/datetime";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

// --- Helper Functions ---
const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const getYearsInBusiness = (createdAt: string | Date) => {
    if (!createdAt) return 0;
    return new Date().getFullYear() - new Date(createdAt).getFullYear();
};

const maskPhone = (phone: string) => {
    if (!phone) return "";
    // Show last 7 digits: +92 300 1234567 → +92 300 ***4567
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 7) return phone;
    return phone.slice(0, -7) + '****' + phone.slice(-3);
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
    return labels[category?.toLowerCase()] || category;
};

// Mock additional services for display (from pricingPackages)
const getDisplayServices = (pricingPackages: any[]) => {
    return pricingPackages.map((pkg: any) => ({
        name: pkg.name,
        price: pkg.price,
        unit: pkg.minOrder ? `pp` : 'flat',
    }));
};

export default async function VendorProfilePage({ 
    params,
    searchParams
}: { 
    params: Promise<{ vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;
    const isPreview = awaitedSearchParams?.preview === 'true';
    
    // Fetch vendor data alongside the reviews organizers have left for them.
    const [vendor, vendorReviews] = await Promise.all([
        EventVendorService.getVendorById(vendor_id),
        FeedbackService.getVendorReviews(vendor_id),
    ]);
    if (!vendor) {
        notFound();
    }

    const v = vendor;
    const businessName = v?.businessName || "Vendor Profile";
    const rating = v?.ratings?.averageRating || 0;
    const totalReviews = v?.ratings?.totalReviews || 0;
    const stats = v?.stats || {};
    const contact = v?.contact || {};
    const address = contact?.address || {};
    const portfolioImages = v?.portfolio?.images || [];
    // Prefer the deliberately-chosen cover; fall back to the first portfolio image.
    const coverImage = v?.portfolio?.coverImage || portfolioImages[0]?.url || "";
    const pricingPackages = v?.pricingPackages || [];
    const verification = v?.verification || {};
    const settings = v?.settings || {};
    const yearsInBusiness = getYearsInBusiness(v?.createdAt);
    
    // Services for display — real pricing packages only (no mock filler).
    const services = getDisplayServices(v?.services);

    // Real booking-derived stats from the bookings collection.
    const bookings = (await BookingServices.getAllBookingsOfVendor(vendor_id)) ?? [];
    const totalBookings = bookings.length;
    const bookingsByOrganizer: Record<string, number> = {};
    bookings.forEach((b: any) => {
        const orgId = b?.organizerId;
        if (orgId) bookingsByOrganizer[orgId] = (bookingsByOrganizer[orgId] ?? 0) + 1;
    });
    const repeatBookings = Object.values(bookingsByOrganizer).filter((c) => c > 1).reduce((s, c) => s + c, 0);
    const repeatPct = totalBookings > 0 ? Math.round((repeatBookings / totalBookings) * 100) : 0;
    const avgResponseTime = (stats as any)?.avgResponseTime || "—";

    // Portfolio sections (normalized by mapToPortfolio, so always arrays).
    const portfolioVideos: string[] = v?.portfolio?.videos || [];
    const clientTestimonials = v?.portfolio?.clientTestimonials || [];

    // Resolve the vendor's booked events (id → title) so past events read as
    // titles rather than raw IDs.
    const bookedEventIds = [...new Set(bookings.map((b: any) => b?.eventId).filter(Boolean))] as string[];
    const bookedEvents = (
        await Promise.all(
            bookedEventIds.map(async (id) => {
                try {
                    const ev = await EventService.getEventByID(id);
                    return ev ? { id, title: ev.title || id } : { id, title: id };
                } catch {
                    return { id, title: id };
                }
            })
        )
    );
    const eventTitleById = new Map(bookedEvents.map((e) => [e.id, e.title]));

    // Past events are *earned*, not chosen: every event this vendor actually
    // completed a booking for. The vendor used to hand-pick these from a
    // dropdown, which made the list a claim rather than a record.
    const completedEvents = [
        ...new Map(
            bookings
                .filter((b: any) => b?.status === "completed" && b?.eventId)
                .map((b: any) => [b.eventId, { id: b.eventId, title: eventTitleById.get(b.eventId) || b.eventId }])
        ).values(),
    ];
const tabs = [
        { id: 'services', label: 'Services' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'reviews', label: 'Reviews' },
    ];
    // Active tab from URL
    const activeTab = (awaitedSearchParams?.tab as string) || 'services';

 
    return (
        <div className="min-h-screen bg-gray-100">
            
            {/* Top Header */}
            <div className=" border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href={`/vendor/${vendor_id}`}
                            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-lg font-bold text-gray-900">Vendor Profile</h1>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Preview Toggle */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Preview as Organizer</span>
                            <Link
                                href={`/vendor/${vendor_id}/profile?preview=${!isPreview}`}
                                className={`relative w-11 h-6 rounded-full transition-colors ${isPreview ? 'bg-black' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPreview ? 'right-1' : 'left-1'}`} />
                            </Link>
                        </div>
                       
                       
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN - Profile Info */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                            {/* Banner Image */}
                            <div className="relative h-48 bg-gray-200">
                                {coverImage ? (
                                    <img
                                        src={coverImage}
                                        alt={businessName}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover grayscale"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                                )}
                                
                                {/* Avatar / Logo */}
                                <div className="absolute -bottom-8 left-6">
                                    {v.logo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={v.logo}
                                            alt={businessName}
                                            className="w-16 h-16 rounded-full object-cover border-4 border-white bg-white"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-xl font-bold border-4 border-white">
                                            {businessName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Profile Info */}
                            <div className="pt-10 pb-6 px-6">
                                <h2 className="text-xl font-bold text-gray-900">{businessName}</h2>

                                {!isPreview && (
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Business Logo</p>
                                            <VendorLogoUpload vendorId={vendor_id} currentLogo={v.logo} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Cover Image</p>
                                            <VendorCoverUpload vendorId={vendor_id} currentCover={v?.portfolio?.coverImage} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-sm font-bold text-gray-900">{rating}</span>
                                    </div>
                                    <span className="text-sm text-gray-400">({totalReviews} reviews)</span>
                                </div>

                                <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                                    No bio added yet.
                                </p>

                                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {[address?.city, address?.country].filter(Boolean).join(', ') || 'Location not set'}
                                    </span>
                                </div>

                                {/* Social Links */}
                                <div className="flex items-center gap-3 mt-4">
                                    {contact?.website && (
                                        <a href={contact.website} target="_blank" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9m-9 9h18" />
                                            </svg>
                                        </a>
                                    )}
                                    <a href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>
                                    <a href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                    </a>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bookings</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">{totalBookings}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Years</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">{yearsInBusiness || 0}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Response</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">{avgResponseTime}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Repeat</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">{repeatPct}%</p>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-6 mt-6 border-b border-gray-100">
                                    {tabs.map((tab) => (
                                        <Link
                                            key={tab.id}
                                            href={`/vendor/${vendor_id}/profile?tab=${tab.id}`}
                                            className={`pb-3 text-sm font-medium transition relative ${
                                                activeTab === tab.id
                                                    ? "text-gray-900 border-b-2 border-black"
                                                    : "text-gray-400 hover:text-gray-600"
                                            }`}
                                        >
                                            {tab.label}
                                        </Link>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="mt-6 space-y-4">
                                    {activeTab === 'services' && services.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-8">No services added yet.</p>
                                    )}
                                    {activeTab === 'services' && services.map((service: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{service.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">{formatCurrency(service.price)}</p>
                                                <p className="text-[10px] text-gray-400">/{service.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {activeTab === 'portfolio' && (
                                        !isPreview ? (
                                            <div className="space-y-6">
                                                <PortfolioImageManager vendorId={vendor_id} images={portfolioImages} />
                                                <div>
                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Videos</p>
                                                    <PortfolioVideoManager vendorId={vendor_id} videos={portfolioVideos} />
                                                </div>
                                                <div>
                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Past Events</p>
                                                    {completedEvents.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {completedEvents.map((e) => (
                                                                <span key={e.id} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">{e.title}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">
                                                            Events you complete will appear here automatically.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-3">
                                                    {portfolioImages.map((img: any, i: number) => (
                                                        <div key={i} className="aspect-square bg-gray-200 rounded-xl overflow-hidden">
                                                            {img?.url ? (
                                                                <img src={img.url} alt={img.caption} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                                                            )}
                                                        </div>
                                                    ))}
                                                    {portfolioImages.length === 0 && (
                                                        <p className="text-sm text-gray-400 col-span-2 text-center py-8">No portfolio images yet.</p>
                                                    )}
                                                </div>
                                                {portfolioVideos.length > 0 && (
                                                    <div>
                                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Videos</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {portfolioVideos.map((url: string, i: number) => (
                                                                <video key={i} src={url} controls className="aspect-video w-full rounded-xl bg-gray-900 object-cover" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {completedEvents.length > 0 && (
                                                    <div>
                                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Past Events</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {completedEvents.map((e) => (
                                                                <span key={e.id} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">{e.title}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                    
                                    {activeTab === 'reviews' && (
                                            <div className="space-y-6">
                                                {/* Reviews come from organizers after a completed booking — the
                                                    vendor can't author these, only read them. */}
                                                {vendorReviews.length > 0 && (
                                                    <div className="space-y-3">
                                                        {vendorReviews.map((r) => (
                                                            <div key={r.id} className="rounded-xl bg-gray-50 p-4">
                                                                <div className="mb-2 flex items-center gap-2">
                                                                    <div className="flex">
                                                                        {[...Array(5)].map((_, si) => (
                                                                            <svg key={si} className={`w-3 h-3 ${si < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`} viewBox="0 0 20 20">
                                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                            </svg>
                                                                        ))}
                                                                    </div>
                                                                    <span className="ml-auto rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Verified booking</span>
                                                                </div>
                                                                {r.title && <p className="text-sm font-bold text-gray-900">{r.title}</p>}
                                                                <p className="text-sm text-gray-600">{r.comment}</p>
                                                                <p className="mt-2 text-xs text-gray-400">
                                                                    — {r.reviewerName || 'Event organizer'}{r.createdAt ? ` • ${formatDate(r.createdAt)}` : ""}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {clientTestimonials.length > 0 && (
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your older testimonials</p>
                                                        {clientTestimonials.map((t: any, i: number) => (
                                                            <div key={i} className="bg-gray-50 rounded-xl p-4">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="flex">
                                                                        {[...Array(5)].map((_, si) => (
                                                                            <svg key={si} className={`w-3 h-3 ${si < (t?.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20">
                                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                            </svg>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-gray-600 italic">&quot;{t?.testimonial}&quot;</p>
                                                                <p className="text-xs text-gray-400 mt-2">— {t?.clientName}{t?.eventDate ? ` • ${t.eventDate}` : ""}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {vendorReviews.length === 0 && clientTestimonials.length === 0 && (
                                                    <p className="text-sm text-gray-400 text-center py-8">
                                                        No reviews yet. Organizers can review you once a booking is completed.
                                                    </p>
                                                )}
                                            </div>
                                    )}

                                    {activeTab === 'availability' && (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-gray-400">Availability calendar coming soon.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Settings */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Account Settings */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-gray-900">Account Settings</h3>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        defaultValue={contact?.businessEmail || ''}
                                        placeholder="business@email.com"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        defaultValue={contact?.primaryPhone || ''}
                                        placeholder="+92 300 0000000"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Two-Factor Authentication</p>
                                    <p className="text-xs text-gray-400">Secure your account with an extra layer of protection</p>
                                </div>
                                <form action={toggle2FAAction}>
                                    <input type="hidden" name="vendorId" value={vendor_id} />
                                    <button
                                        type="submit"
                                        className={`relative w-11 h-6 rounded-full transition-colors ${settings?.notificationPreferences?.newQuotes ? 'bg-black' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings?.notificationPreferences?.newQuotes ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Business Profile */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-gray-900">Business Profile</h3>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        defaultValue={businessName}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Short Bio</label>
                                    <textarea
                                        rows={3}
                                        defaultValue=""
                                        placeholder="Tell clients about your business..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notifications
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Quote Requests</span>
                                    <form action={toggleNotificationAction}>
                                        <input type="hidden" name="vendorId" value={vendor_id} />
                                        <input type="hidden" name="type" value="newQuotes" />
                                        <button
                                            type="submit"
                                            className={`relative w-11 h-6 rounded-full transition-colors ${settings?.notificationPreferences?.newQuotes ? 'bg-black' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings?.notificationPreferences?.newQuotes ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </form>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">New Bookings</span>
                                    <form action={toggleNotificationAction}>
                                        <input type="hidden" name="vendorId" value={vendor_id} />
                                        <input type="hidden" name="type" value="bookingConfirmations" />
                                        <button
                                            type="submit"
                                            className={`relative w-11 h-6 rounded-full transition-colors ${settings?.notificationPreferences?.bookingConfirmations ? 'bg-black' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings?.notificationPreferences?.bookingConfirmations ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div> */}

                        {/* Payments & Tax */}
                        {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-gray-900">Payments & Tax</h3>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            
                            <div className="flex items-center justify-center py-6">
                                <div className="text-center">
                                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <p className="text-xs text-gray-400">No payout method added yet.</p>
                                </div>
                            </div>
                        </div> */}

                        {/* Danger Zone */}
                        {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-red-600 mb-4">Danger Zone</h3>
                            
                            <div className="flex items-center gap-3">
                                <form action={pauseAccountAction}>
                                    <input type="hidden" name="vendorId" value={vendor_id} />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-full text-sm font-medium hover:bg-red-50 transition"
                                    >
                                        Pause Account
                                    </button>
                                </form>
                                <form action={deactivateAccountAction}>
                                    <input type="hidden" name="vendorId" value={vendor_id} />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-full text-sm font-medium hover:bg-red-50 transition"
                                    >
                                        Deactivate
                                    </button>
                                </form>
                                <form action={deleteProfileAction}>
                                    <input type="hidden" name="vendorId" value={vendor_id} />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition"
                                    >
                                        Delete Profile
                                    </button>
                                </form>
                            </div>
                        </div> */}

                        {/* Save Bar */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <Link
                                href={`/vendor/${vendor_id}/profile`}
                                className="text-sm text-gray-500 hover:text-gray-700 transition"
                            >
                                Reset
                            </Link>
                            <form action={saveProfileAction}>
                                <input type="hidden" name="vendorId" value={vendor_id} />
                                <button
                                    type="submit"
                                    className="bg-black text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
                                >
                                    Save Changes
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// Server Actions
async function toggle2FAAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendorId') as string;
    // TODO: Toggle 2FA via API
    console.log('Toggle 2FA for', vendorId);
    redirect(`/vendor/${vendorId}/profile`);
}

async function toggleNotificationAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendorId') as string;
    const type = formData.get('type') as string;
    // TODO: Toggle notification preference via API
    console.log('Toggle notification', type, 'for', vendorId);
    redirect(`/vendor/${vendorId}/profile`);
}

async function pauseAccountAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendorId') as string;
    // TODO: Pause account via API
    console.log('Pause account', vendorId);
    redirect(`/vendor/${vendorId}/profile`);
}

async function deactivateAccountAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendorId') as string;
    // TODO: Deactivate account via API
    console.log('Deactivate account', vendorId);
    redirect(`/vendor/${vendorId}/profile`);
}

async function deleteProfileAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendorId') as string;
    // TODO: Delete profile via API
    console.log('Delete profile', vendorId);
    redirect('/');
}

async function saveProfileAction(formData: FormData) {
    'use server';
    const vendorId = formData.get('vendorId') as string;
    // TODO: Save profile changes via API
    console.log('Save profile', vendorId);
    redirect(`/vendor/${vendorId}/profile`);
}