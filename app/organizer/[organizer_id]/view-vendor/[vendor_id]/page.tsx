import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { formatDate } from "@/src/lib/datetime";

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return "Custom";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
    }).format(amount);
};

// --- Star Rating Component ---
const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) => {
    const fullStars = Math.floor(rating || 0);
    const hasHalf = (rating || 0) % 1 >= 0.5;
    const sizeClass = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    className={`${sizeClass} ${i < fullStars ? 'text-gray-900 fill-gray-900' : i === fullStars && hasHalf ? 'text-gray-900 fill-gray-900' : 'text-gray-300 fill-gray-300'}`}
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

// --- Verification Badge ---
const VerificationBadge = ({ label }: { label: string }) => (
    <span className="bg-black text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
        {label}
    </span>
);

export default async function VendorProfilePage({
    params,
    searchParams
}: {
    params: Promise<{ organizer_id: string; vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { organizer_id, vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    const activeTab = (awaitedSearchParams?.tab as string) || "services";

    // Fetch vendor data
    const v = await EventVendorService.getVendorById(vendor_id);


    const businessName = v?.businessName || "Vendor Profile";
    const rating = v?.ratings?.averageRating || 0;
    const totalReviews = v?.ratings?.totalReviews || 0;
    const city = v?.contact?.address?.city || "Unknown City";
    const country = v?.contact?.address?.country || "Unknown Country";
    const street = v?.contact?.address?.street || "";
    const primaryPhone = v?.contact?.primaryPhone || "";
    const businessEmail = v?.contact?.businessEmail || "";
    const website = v?.contact?.website || "";
    const portfolioImages = v?.portfolio?.images || [];
    const portfolioVideos = v?.portfolio?.videos || [];
    const coverImage = v?.portfolio?.coverImage || portfolioImages[0]?.url || "";
    const logo = v?.logo || "";
    const testimonials = v?.portfolio?.clientTestimonials || [];
    const pricingPackages = v?.pricingPackages || [];
    const verificationBadges = v?.verification?.verificationBadges || [];
    const isVerified = v?.verification?.verified || false;
    const stats = v?.stats || {};
    const createdAt = v?.createdAt || "";
    const serviceCategories = v?.serviceCategories || [];

    const yearsInBusiness = createdAt
        ? new Date().getFullYear() - new Date(createdAt).getFullYear()
        : null;

    const baseUrl = `/organizer/${organizer_id}/view-vendor`;
    const profileUrl = `${baseUrl}/${vendor_id}`;


    const quoteUrl = `${profileUrl}/req-quote`;

    // Tab configuration
    const tabs = [
        { id: "services", label: "Services" },
        { id: "portfolio", label: "Portfolio" },
        { id: "reviews", label: `Reviews (${totalReviews})` },
    ];

    return (
        <div className="min-h-screen bg-gray-50">


            {/* Profile Info Section - Below Banner */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

                    {/* Left: Vendor Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            {logo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logo} alt={businessName} className="w-12 h-12 rounded-full object-cover border border-gray-200 bg-white" />
                            )}
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{businessName}</h1>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-3">
                            <StarRating rating={rating} size="sm" />
                            <span className="font-bold text-sm text-gray-900">{rating || "N/A"}</span>
                            <span className="text-xs text-gray-400">({totalReviews} reviews)</span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {city}{country ? `, ${country}` : ''}
                            </span>
                        </div>

                        {/* Serving Areas */}
                        {street && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Serving: {street}
                            </div>
                        )}

                       
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-3 lg:min-w-[280px]">
                        <Link
                            href={quoteUrl}
                            className="w-full bg-black text-white py-3 px-6 rounded-full font-semibold text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2"
                        >
                            Request Quote
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex gap-6 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`${profileUrl}?tab=${tab.id}`}
                            className={`pb-3 text-sm font-medium transition relative ${activeTab === tab.id
                                    ? "text-gray-900 border-b-2 border-gray-900"
                                    : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 pb-20">

                {/* ===== SERVICES TAB ===== */}
                {activeTab === "services" && (
                    <div>
                        {pricingPackages.length > 0 ? (
                            <div className="space-y-6">
                                {pricingPackages.map((pkg: any, index: number) => {
                                    // Media from THE SERVICE — no positional portfolio offset.
                                    const packageVideo = pkg?.videos?.[0];
                                    const packageImage = pkg?.images?.[0];
                                    const inclusions = pkg?.inclusions || [];
                                    const customizations = pkg?.customizationOptions || [];

                                    return (
                                        <div key={pkg?.packageId || index} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">

                                            {/* Package Image */}
                                            <div className="w-full md:w-48 h-48 md:h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
                                                {packageVideo ? (
                                                    <video
                                                        src={packageVideo}
                                                        muted
                                                        loop
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : packageImage ? (
                                                    <img
                                                        src={packageImage}
                                                        alt={pkg?.name || "Package"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                        <span className="text-3xl opacity-40">
                                                            {serviceCategories[0] === "catering" ? "🍽️" : "📦"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Package Info */}
                                            <div className="flex-1">
                                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900">{pkg?.name || "Unnamed Package"}</h3>
                                                    <div className="text-right flex-shrink-0">
                                                        {pkg?.price ? (
                                                            <span className="text-lg font-bold text-gray-900">{formatCurrency(pkg.price)}</span>
                                                        ) : (
                                                            <span className="text-lg font-bold text-gray-900">Custom</span>
                                                        )}
                                                        <span className="text-xs text-gray-400 ml-1">/ {pkg?.minOrder ? `min ${pkg.minOrder}` : 'person'}</span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                                    {pkg?.description || "No description available for this package."}
                                                </p>

                                                {/* Inclusions Grid */}
                                                {inclusions.length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                                                        {inclusions.map((item: string, i: number) => (
                                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Customization Tags */}
                                                {customizations.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {customizations.map((opt: string, i: number) => (
                                                            <span key={i} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                                                                {opt.replace('_', ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* CTA Button */}
                                                <Link
                                                    href={`${quoteUrl}?package=${pkg?.packageId || ''}`}
                                                    className="inline-block bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-800 transition"
                                                >
                                                    {pkg?.price ? "Request Quote for This Service" : "Inquire for Custom Pricing"}
                                                </Link>
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
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No Packages Available</h3>
                                <p className="text-sm text-gray-500 mb-4">This vendor hasn't listed any service packages yet.</p>
                                <Link
                                    href={quoteUrl}
                                    className="inline-block bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-800 transition"
                                >
                                    Request Custom Quote
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== PORTFOLIO TAB ===== */}
                {activeTab === "portfolio" && (
                    <div>
                        {/* Images Grid */}
                        {portfolioImages.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                {portfolioImages.map((img: any, i: number) => (
                                    <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
                                        <div className="relative h-56 bg-gray-200 overflow-hidden">
                                            {img?.url ? (
                                                <img
                                                    src={img.url}
                                                    alt={img?.caption || "Portfolio image"}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                                    <span className="text-4xl">🖼️</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-semibold text-sm text-gray-900 mb-1">{img?.caption || "Untitled"}</h4>
                                            <div className="flex items-center justify-between text-xs text-gray-400">
                                                <span className="capitalize">{img?.eventType || "Event"}</span>
                                                <span>{img?.date ? formatDate(img.date) : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mb-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No Portfolio Images</h3>
                                <p className="text-sm text-gray-500">This vendor hasn't uploaded any portfolio images yet.</p>
                            </div>
                        )}

                        {/* Videos */}
                        {portfolioVideos.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Videos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {portfolioVideos.map((video: string, i: number) => (
                                        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                            <video
                                                src={video}
                                                controls
                                                className="aspect-video w-full rounded-xl bg-gray-900 object-cover"
                                            />
                                            <p className="text-xs text-gray-400 mt-2">Video {i + 1}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Past Events */}
                        {v?.portfolio?.pastEvents && v.portfolio.pastEvents.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Past Events</h3>
                                <div className="flex flex-wrap gap-2">
                                    {v.portfolio.pastEvents.map((evt: string, i: number) => (
                                        <span key={i} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
                                            {evt}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== REVIEWS TAB ===== */}
                {activeTab === "reviews" && (
                    <div>
                        {/* Rating Summary */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-gray-900">{rating || "0.0"}</div>
                                    <StarRating rating={rating} size="md" />
                                    <div className="text-xs text-gray-400 mt-1">{totalReviews} reviews</div>
                                </div>
                                <div className="flex-1 ml-4">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = v?.ratings?.breakdown?.[star.toString()] || 0;
                                        const total = totalReviews || 1;
                                        const percentage = (count / total) * 100;
                                        return (
                                            <div key={star} className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-gray-500 w-3">{star}</span>
                                                <svg className="w-3 h-3 text-gray-900 fill-gray-900" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${percentage}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Testimonials */}
                        {testimonials.length > 0 ? (
                            <div className="space-y-4">
                                {testimonials.map((t: any, i: number) => (
                                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <StarRating rating={t?.rating || 5} size="sm" />
                                            <span className="text-xs text-gray-400 ml-1">{t?.rating || 5}.0</span>
                                        </div>
                                        <p className="text-sm text-gray-600 italic mb-4 leading-relaxed">"{t?.testimonial || 'No testimonial text.'}"</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {(t?.clientName || "A")[0]}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">{t?.clientName || 'Anonymous'}</span>
                                            </div>
                                            <span className="text-xs text-gray-400">{t?.eventDate ? formatDate(t.eventDate) : ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No Reviews Yet</h3>
                                <p className="text-sm text-gray-500">Be the first to review this vendor after your event.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== AVAILABILITY TAB ===== */}
                {activeTab === "availability" && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Availability Calendar</h3>
                        <p className="text-sm text-gray-500 mb-4">Check available dates and request a booking.</p>
                        <Link
                            href={quoteUrl}
                            className="inline-block bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-800 transition"
                        >
                            Request a Date
                        </Link>
                    </div>
                )}

                {/* Contact Info Footer - Always visible */}
                <div className="mt-12 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {primaryPhone && (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {primaryPhone}
                            </div>
                        )}
                        {businessEmail && (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {businessEmail}
                            </div>
                        )}
                        {website && (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9m-9 9h18" />
                                </svg>
                                <a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline">{website.replace('https://', '')}</a>
                            </div>
                        )}
                        {street && (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {street}, {city}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}