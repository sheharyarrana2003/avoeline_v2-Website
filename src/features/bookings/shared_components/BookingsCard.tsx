import React from 'react';
import Link from 'next/link';
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { statusMeta } from "@/src/lib/status";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";


export async function  BookingsCard({params, booking }: {params : Promise<{ organizer_id: string }>, booking: any }) {
    const resolvedParams = await params;
  const organizerId = resolvedParams.organizer_id; 
  const basePath = `/organizer/${organizerId}`;

  // Safe destructuring based on typical data shape. Adjust to your exact schema.
  const vendorName = booking?.vendor?.businessName || "Unknown Vendor";
  const vendorInitials = vendorName.substring(0, 2).toUpperCase();
  const serviceType = booking?.vendor?.serviceCategories?.[0]?.replace('_', ' ') || "Service";
  const eventName = booking?.eventName || "Event";
  const date = booking?.requirements?.serviceDate ? formatDate(booking.requirements.serviceDate) : "TBD";
  
  // Try to get total amount, default to 0
  const amount = booking?.quote?.vendorQuote?.totalAmount || booking?.estimatedAmount || 0;
  const status = booking?.status || "pending";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      
      {/* Top Row: Avatar, Name, Status Badge */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-700 border border-gray-100 font-semibold flex items-center justify-center text-sm">
            {vendorInitials}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">
              {vendorName}
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {serviceType}
            </p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Middle Row: Pricing & Event Info */}
      <div className="mb-6">
        <div className="text-xl font-bold text-gray-900 mb-1">
          {formatCurrency(amount)}
        </div>
        <div className="text-sm text-gray-500">
          {eventName} • {date}
        </div>
      </div>

      {/* Bottom Row: Simple Status & Generic Button */}
      <div className="mt-auto pt-4 border-t border-gray-50">
        <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          Current status: <span className="font-medium">{statusMeta(status).label}</span>
        </p>
        
        <Link 
         href={`${basePath}/booking-details/${booking?.bookingId}`}
        className="w-full bg-black text-white hover:bg-gray-800 transition-colors py-3 px-4 rounded-xl font-semibold text-sm">
          View Details
        </Link>
      </div>

    </div>
  );
}