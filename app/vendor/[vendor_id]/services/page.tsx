// app/vendor/[vendor_id]/services/page.tsx
// Fully Server Component

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    return labels[category?.toLowerCase()] || category;
};

const getCategoryCount = (packages: any[], category: string) => {
    // In real app, packages would have a category field. 
    // For now, map based on package name/content
    if (category === 'catering') return packages.filter((p: any) => 
        p.name.toLowerCase().includes('catering') || 
        p.name.toLowerCase().includes('buffet') ||
        p.name.toLowerCase().includes('lunch') ||
        p.name.toLowerCase().includes('wedding')
    ).length;
    if (category === 'event_management') return packages.filter((p: any) => 
        p.name.toLowerCase().includes('event') || 
        p.name.toLowerCase().includes('management')
    ).length;
    return 0;
};

const getServiceStatus = (pkg: any, index: number) => {
    // Mock status logic - first 2 active, last one inactive
    if (index < 2) return { status: 'active', label: 'ACTIVE', color: 'bg-green-500 text-white' };
    return { status: 'inactive', label: 'INACTIVE', color: 'bg-white text-gray-500' };
};

const isPopular = (pkg: any, index: number) => {
    // Mock popular flag
    return index === 1; // Premium Wedding Package is popular
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
    
    const businessName = vendor?.businessName || "Vendor Services";
    const pricingPackages = vendor?.pricingPackages || [];
    const serviceCategories = vendor?.serviceCategories || [];
    const portfolioImages = vendor?.portfolio?.images || [];
    
    // Build category tabs from vendor's serviceCategories
    const categoryTabs = [
        { id: 'all', label: 'All Services', count: pricingPackages.length },
        ...serviceCategories.map((cat: string) => ({
            id: cat.toLowerCase(),
            label: getCategoryLabel(cat),
            count: getCategoryCount(pricingPackages, cat),
        })),
    ];
    
    // Filter packages by category
    let displayPackages = pricingPackages;
    if (filter !== 'all') {
        displayPackages = pricingPackages.filter((pkg: any) => {
            const pkgName = pkg.name.toLowerCase();
            if (filter === 'catering') {
                return pkgName.includes('catering') || pkgName.includes('buffet') || pkgName.includes('lunch') || pkgName.includes('wedding') || pkgName.includes('drop');
            }
            if (filter === 'event_management') {
                return pkgName.includes('event') || pkgName.includes('management');
            }
            return true;
        });
    }
    
    // Add status and metadata to packages
    const enrichedPackages = displayPackages.map((pkg: any, index: number) => ({
        ...pkg,
        statusInfo: getServiceStatus(pkg, index),
        isPopular: isPopular(pkg, index),
        category: index < 2 ? 'catering' : 'event_management',
    }));

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            
            {/* Top Navigation */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="font-bold text-gray-900">AVOELINE</span>
                        </div>
                        
                        {/* Nav Links */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href={`/vendor/${vendor_id}`} className="text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
                            <Link href={`/vendor/${vendor_id}/bookings`} className="text-sm text-gray-500 hover:text-gray-900">Bookings</Link>
                            <Link href={`/vendor/${vendor_id}/services`} className="text-sm font-bold text-gray-900 border-b-2 border-black pb-5 pt-5">Services</Link>
                            <Link href={`/vendor/${vendor_id}/earnings`} className="text-sm text-gray-500 hover:text-gray-900">Earnings</Link>
                            <Link href={`/vendor/${vendor_id}/profile`} className="text-sm text-gray-500 hover:text-gray-900">Profile</Link>
                        </nav>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="relative text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your professional service catalog, pricing models, and availability status.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            href={`/vendor/${vendor_id}/portfolio`}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                            View Portfolio
                        </Link>
                        <Link 
                            href={`/vendor/${vendor_id}/services/new`}
                            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                        >
                            <span>+</span> Add New Service
                        </Link>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-2 mb-8">
                    {categoryTabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`/vendor/${vendor_id}/services?filter=${tab.id}`}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${
                                filter === tab.id
                                    ? 'bg-black text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {tab.label} ({tab.count})
                        </Link>
                    ))}
                </div>

                {/* Services Grid */}
                {enrichedPackages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrichedPackages.map((pkg: any, index: number) => {
                            const isActive = pkg.statusInfo.status === 'active';
                            const isInactive = pkg.statusInfo.status === 'inactive';
                            const portfolioImage = portfolioImages[index]?.url;
                            
                            return (
                                <div 
                                    key={pkg.packageId} 
                                    className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition ${
                                        isInactive ? 'opacity-60 border-gray-200' : 'border-gray-100 hover:shadow-md'
                                    }`}
                                >
                                    {/* Image Header */}
                                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                                        {portfolioImage ? (
                                            <img 
                                                src={portfolioImage} 
                                                alt={pkg.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                                <span className="text-4xl">🍽️</span>
                                            </div>
                                        )}
                                        
                                        {/* Status Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pkg.statusInfo.color}`}>
                                                {pkg.statusInfo.label}
                                            </span>
                                        </div>
                                        
                                        {/* Popular Badge */}
                                        {pkg.isPopular && (
                                            <div className="absolute top-3 right-3">
                                                <span className="text-[10px] font-bold bg-white text-gray-900 px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-200">
                                                    POPULAR
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Edit/Delete Actions */}
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <Link 
                                                href={`/vendor/${vendor_id}/services/${pkg.packageId}/edit`}
                                                className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition shadow-sm"
                                            >
                                                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </Link>
                                            <form action={deleteServiceAction} className="inline">
                                                <input type="hidden" name="packageId" value={pkg.packageId} />
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
                                            {getCategoryLabel(pkg.category || 'catering')}
                                        </p>
                                        
                                        {/* Title */}
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h3>
                                        
                                        {/* Description */}
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                            {pkg.description}
                                        </p>
                                        
                                        {/* Price & Action */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-lg font-bold text-gray-900">{formatCurrency(pkg.price)}</span>
                                                <span className="text-xs text-gray-400 ml-1">/ {pkg.minOrder ? `min ${pkg.minOrder}` : 'person'}</span>
                                            </div>
                                            
                                            {isActive ? (
                                                <Link 
                                                    href={`/vendor/${vendor_id}/services/${pkg.packageId}`}
                                                    className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1 hover:text-gray-600 transition"
                                                >
                                                    View Packages
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </Link>
                                            ) : (
                                                <form action={activateServiceAction}>
                                                    <input type="hidden" name="packageId" value={pkg.packageId} />
                                                    <button 
                                                        type="submit"
                                                        className="text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition"
                                                    >
                                                        Activate to View
                                                    </button>
                                                </form>
                                            )}
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
                            href={`/vendor/${vendor_id}/services/new`}
                            className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
                        >
                            + Add New Service
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
    const packageId = formData.get('packageId') as string;
    // TODO: Call API to delete service
    console.log('Delete service', packageId);
}

async function activateServiceAction(formData: FormData) {
    'use server';
    const packageId = formData.get('packageId') as string;
    // TODO: Call API to activate service
    console.log('Activate service', packageId);
}