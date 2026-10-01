'use client'
import React, { useState, useTransition } from 'react';
import { BookingData } from '@/src/features/bookings/types';
import { useRouter } from 'next/navigation';
import { buttonClass, fieldClass, labelClass } from '@/src/lib/ui';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';
import { formatCurrency } from '@/src/lib/money';

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
    // Only meaningful when there IS a sane current total. Applied against a missing
    // or corrupt one — live data has a quote of PKR -20 — this rule combined with
    // the positive check above admits no number at all, and the form can never be
    // submitted. A quote with no valid total is one you can counter freely.
    if (currentTotal > 0 && targetBudget >= currentTotal) {
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-5 rounded-2xl border border-line bg-paper p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-ink">Make a Counter Offer</h2>
        <p className="text-sm text-ink-soft">
          Propose a revised budget or request structural adjustments to the current quote.
        </p>
      </div>

      <hr className="border-line" />

      {/* CURRENT QUOTE SUMMARY */}
      <div className="bg-muted p-4 rounded-lg flex justify-between items-center text-sm border border-line">
        <div>
          <span className="text-ink-soft block">Vendor&apos;s current offer</span>
          {/* A quote of PKR -20 is not a price. Saying so is more use than printing
              it as though it were, and the counter-offer rules below skip the
              "must be lower" check when there is no sane figure to be lower than. */}
          <span className="font-semibold text-ink">
            {currentTotal > 0 ? formatCurrency(currentTotal, 'PKR') : 'Not quoted yet'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-ink-soft block">Guest count</span>
          <span className="font-semibold text-ink">
            {/* 0 is what an unanswered guest-count field stores, and "0 guests" reads
                as a fact rather than a blank. */}
            {bookingData.requirements?.guestCount
              ? `${bookingData.requirements.guestCount} guests`
              : 'Not specified'}
          </span>
        </div>
      </div>

      {/* TARGET BUDGET INPUT */}
      <div>
        <label htmlFor="targetBudget" className={labelClass}>
          Your proposed target price (PKR)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-ink-soft text-sm">PKR</span>
          </div>
          <input
            id="targetBudget"
            name="targetBudget"
            type="number"
            // min/step so the browser rejects a negative before the handler has to,
            // which is how the -20 got in here in the first place.
            min={1}
            step={1}
            value={targetBudget || ''}
            onChange={(e) => setTargetBudget(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 130000"
            className={`${fieldClass} pl-12`}
            required
          />
        </div>
      </div>

      {/* NEGOTIATION MESSAGE */}
      <div>
        <label htmlFor="organizerMessage" className={labelClass}>
          What would you like to adjust?
        </label>
        <textarea
          id="organizerMessage"
          name="organizerMessage"
          rows={4}
          placeholder="e.g., 'Can we remove the live dessert platter to bring the price down?' or 'Our maximum hard budget for this setup is PKR 130,000. Is that workable?'"
          value={organizerMessage}
          onChange={(e) => setOrganizerMessage(e.target.value)}
          className={`${fieldClass} mt-1.5`}
          required
        />
      </div>

      {/* ERROR HANDLING */}
      <FormFeedback error={error} />

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={OnCancel}
          className={buttonClass('ghost')}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className={buttonClass('primary')}
        >
          {isPending ? 'Sending…' : 'Send Counter Offer'}
        </button>
      </div>
    </form>
  );
};