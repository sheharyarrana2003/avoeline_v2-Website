'use client'
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";


export function AcceptButton({ quote,accept_quote }: { quote: BookingData,accept_quote:(booking:BookingData)=>void }) {


  return (
    <button 
      onClick={() => accept_quote(quote)}
      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-black text-white py-2.5 px-5 rounded-full text-sm font-semibold hover:bg-gray-800 transition ml-auto"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Accept Quote
    </button>
  );
}