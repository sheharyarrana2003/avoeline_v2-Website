"use client"; // ya server side pa nahi hina chahie -> isko browser ki sunni ha isliye use client
import { useRouter } from "next/navigation";

interface ActionButtonsProps {
  eventId: string;
  organizer_id : string
}

export default function ActionButtons({ eventId,organizer_id }: ActionButtonsProps) {
  const router = useRouter();
  return (
    <div className="w-full space-y-3 mb-8">
      {/* View Event Button */}
      <button 
        onClick={() => router.replace(`/organizer/${organizer_id}/events/${eventId}`)}
        className="w-full bg-black text-white py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-gray-800 transition-colors"
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        View Event
      </button>
      
      {/* Manage Registrations Button */}
      <button 
        onClick={() => router.replace(`/organizer/${organizer_id}/events/${eventId}/attendees`)}
        className="w-full bg-black text-white py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-gray-800 transition-colors"
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Manage Registrations
      </button>
      
      {/* Go to Dashboard Button */}
      <button 
        onClick={() => router.replace(`/organizer/${organizer_id}/dashboard`)}
        className="w-full bg-white border-2 border-black text-black py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors"
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Go to Dashboard
      </button>
    </div>
  );
}