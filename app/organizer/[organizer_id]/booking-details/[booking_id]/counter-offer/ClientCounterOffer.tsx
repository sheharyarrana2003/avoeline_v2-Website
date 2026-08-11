'use client'
import React, { useState, useTransition } from 'react';
import { BookingData } from '@/src/features/bookings/types';
import { useRouter } from 'next/navigation';

interface OrganizerCounterProps {
  bookingData: BookingData;
  onSubmitCounter: (targetBudget: number, message: string) => void;
}

export default function OrganizerCounterOfferForm ({ 
  bookingData, 
  onSubmitCounter, 
} : OrganizerCounterProps) {
  const currentTotal = bookingData.quote.vendorQuote?.totalAmount || 0;
  const router = useRouter();
  // State variables
  const [targetBudget, setTargetBudget] = useState<number>(currentTotal);
  const [organizerMessage, setOrganizerMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return; // guard against duplicate submissions

    // These three were commented out here while the vendor's identical form
    // enforced them, so an organizer could send a counter-offer of zero with
    // no message and the vendor could not. Same rules, both directions.
    if (targetBudget <= 0) {
      setError('Please enter a valid counter-offer amount.');
      return;
    }
    if (targetBudget >= currentTotal) {
      setError('Your counter-offer should generally be less than the current total price.');
      return;
    }
    if (!organizerMessage.trim()) {
      setError('Please include a message to explain your requested changes to the vendor.');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        await onSubmitCounter(targetBudget, organizerMessage);
        router.push(`/organizer/${bookingData.organizerId}/booking-details/${bookingData.bookingId}`);
      } catch {
        setError('Something went wrong sending your counter offer. Please try again.');
      }
    });
  };
  const OnCancel = () => {
    router.push(`/organizer/${bookingData.organizerId}/dashboard`);
  }
  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white border border-gray-200 p-6 rounded-xl shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Make a Counter Offer</h2>
        <p className="text-sm text-gray-500">
          Propose a revised budget or request structural adjustments to the current quote.
        </p>
      </div>

      <hr className="border-gray-200" />

      {/* CURRENT QUOTE SUMMARY */}
      <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center text-sm border border-gray-100">
        <div>
          <span className="text-gray-500 block">Vendor's Current Offer</span>
          <span className="font-semibold text-gray-700">PKR {currentTotal.toLocaleString()}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500 block">Guest Count</span>
          <span className="font-semibold text-gray-700">{bookingData.requirements.guestCount} guests</span>
        </div>
      </div>

      {/* TARGET BUDGET INPUT */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Your Proposed Target Price (PKR)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">PKR</span>
          </div>
          <input
            type="number"
            value={targetBudget || ''}
            onChange={(e) => setTargetBudget(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 130000"
            className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-1 focus:ring-black focus:outline-none"
            required
          />
        </div>
      </div>

      {/* NEGOTIATION MESSAGE */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          What would you like to adjust?
        </label>
        <textarea
          rows={4}
          placeholder="e.g., 'Can we remove the live dessert platter to bring the price down?' or 'Our maximum hard budget for this setup is PKR 130,000. Is that workable?'"
          value={organizerMessage}
          onChange={(e) => setOrganizerMessage(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg text-sm focus:ring-1 focus:ring-black focus:outline-none"
          required
        />
      </div>

      {/* ERROR HANDLING */}
      {error && (
        <p className="text-xs text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-medium">
          ⚠️ {error}
        </p>
      )}

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={OnCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="bg-black hover:bg-gray-800 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending…' : 'Send Counter Offer'}
        </button>
      </div>
    </form>
  );
};