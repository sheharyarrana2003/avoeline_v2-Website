import React from 'react';
import Link from 'next/link';
import { formatDate } from "@/src/lib/datetime";


const getStatusStyles = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  
  switch (normalizedStatus) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return { badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
    case 'CANCELLED':
      return { badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
    case 'QUOTE REQUESTED':
    case 'PENDING':
      return { badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' };
    case 'QUOTE RECEIVED':
    case 'NEGOTIATING':
      return { badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
    default:
      // Default fallback colors
      return { badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
  }
};

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
  const status = booking?.status || "PENDING";

  // Get dynamic styles for the current status
  const statusStyles = getStatusStyles(status);

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
        {/* Dynamically colored badge */}
        <div className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md ${statusStyles.badge}`}>
          {status}
        </div>
      </div>

      {/* Middle Row: Pricing & Event Info */}
      <div className="mb-6">
        <div className="text-xl font-bold text-gray-900 mb-1">
          PKR {amount.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          {eventName} • {date}
        </div>
      </div>

      {/* Bottom Row: Simple Status & Generic Button */}
      <div className="mt-auto pt-4 border-t border-gray-50">
        <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          {/* Dynamically colored dot */}
          <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
          Current Status: <span className="font-medium capitalize">{status.toLowerCase()}</span>
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