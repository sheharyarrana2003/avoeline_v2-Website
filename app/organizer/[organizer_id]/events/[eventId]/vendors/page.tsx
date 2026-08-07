import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatCurrency } from "@/src/lib/money";
import Link from 'next/link';
import { Utensils, Volume2, Aperture, Star, Phone, ArrowRight, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { EventVendorService } from '@/src/features/event_vendors/event_venders.services';
import { VendorData } from '@/src/services/models/vendor.model';
import {PricingPackage} from '@/src/services/models/vendor.model';


export default async function Vendors({params} : {params : Promise<{eventId:string; organizer_id:string}>}) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;
    const organizer_id = resolvedParams.organizer_id;

    const vendors : VendorData[] |null= await EventVendorService.getVendorsByEvent(event_id);

   const renderIcon = (categories: string[]) => {
        if (categories.includes('catering') || categories.includes('food')) {
            return <Utensils size={24} className="text-gray-700" />;
        } else if (categories.includes('av') || categories.includes('sound')) {
            return <Volume2 size={24} className="text-gray-700" />;
        } else if (categories.includes('photography') || categories.includes('video')) {
            return <Aperture size={24} className="text-gray-700" />;
        }
        return <LayoutDashboard size={24} className="text-gray-700" />;
    };

    const renderBadge = (status: string, verified: boolean) => {
        // A verified, active vendor is the good outcome, so it gets the success
        // tone; anything else is still pending someone's attention.
        if (status === 'active' && verified) {
            return (
                <span className="ml-auto inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
                    <CheckCircle2 size={12} aria-hidden="true" /> Verified
                </span>
            );
        }
        return <StatusBadge status={status} size="md" className="ml-auto w-fit py-1.5" />;
    };

    const getStartingPrice = (packages: PricingPackage[]) => {
        if (!packages || packages.length === 0) return null;
        const prices = packages.map(pkg => pkg.price);
        return Math.min(...prices);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-10 font-sans">
            <div className="max-w-4xl mx-auto">
                
                <div className="flex justify-between items-start mb-16">
                    <div>
                        <h1 className="text-[40px] font-extrabold text-gray-900 tracking-tight leading-none mb-4">
                            Event Vendors
                        </h1>
                        <div className="flex items-center gap-3">
                            <span className="bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                                {vendors?.length} Active Vendors
                            </span>
                      
                        </div>
                    </div>
                    
                    <Link href={`/organizer/${organizer_id}/vendor-marketplace`} className="bg-black hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-bold text-[13px] transition-colors shadow-sm">
                        Find Vendors
                    </Link>
                </div>

                <div className="flex justify-between items-end mb-5">
                    <h2 className="text-[22px] font-extrabold text-gray-900">
                        Assigned Vendors
                    </h2>
                    
                </div>

                <div className="space-y-4">
                    {vendors?.map((vendor, index) => {
                        const startingPrice = getStartingPrice(vendor.pricingPackages);

                        return (
                            <div
                                key={vendor.vendorId || index}
                                className="bg-white border border-gray-200/60 rounded-[1.5rem] p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-gray-100 rounded-[1rem] flex items-center justify-center shrink-0">
                                        {renderIcon(vendor.serviceCategories)}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-[18px] font-extrabold text-gray-900">
                                                {vendor.businessName}
                                            </h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mb-4 text-[13px] text-gray-500 font-medium">
                                            <span className="flex items-center gap-1 text-gray-700">
                                                <Star size={14} className="text-amber-400 fill-amber-400" /> 
                                                {vendor.ratings.averageRating.toFixed(1)} 
                                                <span className="text-gray-400 text-xs">({vendor.ratings.totalReviews})</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Phone size={14} className="text-gray-400" /> 
                                                {vendor.contact.primaryPhone}
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link  href={`/organizer/${organizer_id}/view-vendor/${vendor.vendorId}`} className="text-[13px] font-bold px-4 py-2 rounded-full transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200">
                                                View Profile
                                            </Link>
                                            <Link  href={`/organizer/${organizer_id}/view-vendor/${vendor.vendorId}/req-quote`}  className="text-[13px] font-bold px-4 py-2 rounded-full transition-colors bg-black text-white hover:bg-gray-800">
                                                Request Quote
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex flex-col justify-between h-[88px]">
                                    <div>
                                        {renderBadge(vendor.status, vendor.verification.verified)}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 mb-0.5">
                                            {startingPrice ? 'Starting Price' : 'Estimated'}
                                        </p>
                                        <p className={`text-[22px] font-black tracking-tight ${startingPrice ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {startingPrice ? formatCurrency(startingPrice) : 'TBD'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
            </div>
        </div>
    );
}