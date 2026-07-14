'use client'
import { useTransition } from "react";
import { BookingData } from "@/src/features/bookings/types";


export function AcceptButton({ quote,accept_quote }: { quote: BookingData,accept_quote:(booking:BookingData)=>void }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    if (isPending) return; // guard against duplicate submissions
    startTransition(async () => {
      await accept_quote(quote);
    });
  };

  return (
    <button
      onClick={handleAccept}
      disabled={isPending}
      aria-busy={isPending}
      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-black text-white py-2.5 px-5 rounded-full text-sm font-semibold hover:bg-gray-800 transition ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {isPending ? 'Accepting…' : 'Accept Quote'}
    </button>
  );
}