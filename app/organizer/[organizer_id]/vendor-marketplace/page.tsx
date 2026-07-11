import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";

const CATEGORIES = [
    { id: "all", label: "All", icon: "☰", count: 245 },
    { id: "catering", label: "Catering", icon: "🍴" },
    { id: "venues", label: "Venues", icon: "🏢" },
    { id: "photography", label: "Photography", icon: "📷" },
    { id: "decor", label: "Decor", icon: "🎙️" },
    { id: "music", label: "Music", icon: "🎵" },
    { id: "events", label: "Events", icon: "✨" },
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
    }).format(amount);
};

// const RatingBars = ({ breakdown }: { breakdown: any }) => {
//     const total = Object.values(breakdown || {}).reduce((a: any, b: any) => Number(a) + Number(b), 0);
//     if (!total) return null;

//     return (
//         <div className="flex items-center gap-0.5">
//             {[5, 4, 3, 2, 1].map((star) => {
//                 const count = breakdown?.[star.toString()] || 0;
//                 const percentage = total > 0 ? (count / total) * 100 : 0;
//                 return (
//                     <div 
//                         key={star} 
//                         className={`w-1 h-3 rounded-full ${percentage > 50 ? 'bg-gray-800' : 'bg-gray-300'}`}
//                         title={`${star} stars: ${count} reviews`}
//                     />
//                 );
//             })}
//         </div>
//     );
// };

export default async function Vendor_Marketplace({
    params,
    searchParams
}: {
    params: Promise<{ organizer_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const awaited_params = await params;
    const awaited_search_params = await searchParams;

    const { organizer_id } = awaited_params;
    const vendors: VendorData[] | null = await EventVendorService.getAllVendors();

    if (!vendors) {
       return <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">

                {/* Page Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover Providers</h1>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    {CATEGORIES.map((cat) => {
                        const isActive = category === cat.id || (!category && cat.id === "all");

                        return (
                            <Link
                                key={cat.id}
                                href={cat.id === "all"
                                    ? `${base_url}`
                                    : `${base_url}?category=${cat.id}`
                                }
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                                    ${isActive
                                        ? "bg-black text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                    }
                                `}
                            >
                                <span className="text-base">{cat.icon}</span>
                                <span>{cat.label}</span>
                                {cat.count && (
                                    <span className={`text-xs ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                                        ({cat.count})
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
                <div><h1>no vendors to display</h1></div>
            </div>
        </div>

    }

    const category = awaited_search_params.category;
    const string_to_be_searched = awaited_search_params.input_val;


    const base_url = `/organizer/${organizer_id}/vendor-marketplace`;

    // Filter vendors by category if selected
    const filteredVendors = category && category !== "all"
        ? vendors.filter((v: any) =>
            v?.serviceCategories?.some((c: string) => c.toLowerCase() === category.toString().toLowerCase())
        )
        : vendors;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">

                {/* Page Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Discover Providers</h1>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    {CATEGORIES.map((cat) => {
                        const isActive = category === cat.id || (!category && cat.id === "all");

                        return (
                            <Link
                                key={cat.id}
                                href={cat.id === "all"
                                    ? `${base_url}`
                                    : `${base_url}?category=${cat.id}`
                                }
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                                    ${isActive
                                        ? "bg-black text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                    }
                                `}
                            >
                                <span className="text-base">{cat.icon}</span>
                                <span>{cat.label}</span>
                                {cat.count && (
                                    <span className={`text-xs ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                                        ({cat.count})
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Search & Filter Status */}
                {category && (
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm text-gray-500">Filtering by:</span>
                        <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                            {category}
                        </span>
                        <Link
                            href={base_url}
                            className="text-xs text-gray-400 hover:text-gray-600 underline ml-2"
                        >
                            Clear filter
                        </Link>
                    </div>
                )}

                {/* Vendor Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors?.map((vendor: any) => {
                        const primaryCategory = vendor?.serviceCategories?.[0] || "service";
                        const secondaryCategory = vendor?.serviceCategories?.[1] || "";
                        const portfolioImage = vendor?.portfolio?.images?.[0]?.url;
                        const rating = vendor?.ratings?.averageRating || 0;
                        const totalReviews = vendor?.ratings?.totalReviews || 0;
                        const pricePackage = vendor?.pricingPackages?.[0];
                        const price = pricePackage?.price || 0;
                        const city = vendor?.contact?.address?.city || "Pakistan";
                        const country = vendor?.contact?.address?.country || "";

                        return (
                            <div key={vendor?.vendorId} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">

                                {/* Image Header */}
                                <div className="relative h-48 bg-gray-200 overflow-hidden">
                                    {portfolioImage ? (
                                        <img
                                            src={portfolioImage}
                                            alt={vendor?.businessName}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                            <span className="text-4xl">🏢</span>
                                        </div>
                                    )}
                                    {/* Bookmark Button */}
                                    <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Card Content */}
                                <div className="p-5">
                                    {/* Vendor Name & Rating */}
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">
                                                {primaryCategory === "catering" ? "🍴" :
                                                    primaryCategory === "venues" ? "🏛️" :
                                                        primaryCategory === "decor" ? "🌸" :
                                                            primaryCategory === "photography" ? "📷" : "🏢"}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{vendor?.businessName}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="font-bold text-sm text-gray-900">{rating}</span>
                                                <span className="text-xs text-gray-400">({totalReviews} reviews)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Category Tags */}
                                    <div className="flex gap-2 mb-3">
                                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                                            {primaryCategory}
                                        </span>
                                        {secondaryCategory && (
                                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                                                {secondaryCategory}
                                            </span>
                                        )}
                                    </div>

                                    {/* Location & Rating Bars */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-xs text-gray-500">{city}{country ? `, ${country}` : ''}</span>
                                        {/* <RatingBars breakdown={vendor?.ratings?.breakdown} /> */}
                                    </div>

                                    {/* Price */}
                                    <div className="mb-5">
                                        <span className="text-xl font-extrabold text-gray-900">{formatCurrency(price)}</span>
                                        <span className="text-xs text-gray-400 ml-1">/ {pricePackage?.minOrder ? `min ${pricePackage.minOrder}` : 'start'}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Link
                                            href={`/organizer/${organizer_id}/view-vendor/${vendor?.vendorId}`}
                                            className="flex-1 py-2.5 px-4 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition text-center"
                                        >
                                            View Profile
                                        </Link>
                                        <Link
                                            href={`/organizer/${organizer_id}/view-vendor/${vendor?.vendorId}/req-quote`}
                                            className="flex-1 py-2.5 px-4 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition text-center"
                                        >
                                            Request Quote
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    }) || <p className="text-gray-400 col-span-3 text-center py-12">No vendors found.</p>}
                </div>

            </div>
        </div>
    );
}