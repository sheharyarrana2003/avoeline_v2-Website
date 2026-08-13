'use client'
import React, { useState, useTransition } from 'react';
import { BookingData } from '@/src/features/bookings/types';
import { useRouter } from 'next/navigation';
import { buttonClass, fieldClass, labelClass } from '@/src/lib/ui';
import { formatCurrency } from '@/src/lib/money';
import { AlertTriangle } from 'lucide-react';

interface OrganizerCounterProps {
  bookingData: BookingData;
  onSubmitCounter: (targetBudget: number, message: string) => void;
}

export default function VendorCounterOfferForm ({ 
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
      setError('Please include a message to explain your requested changes to the organizer.');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        await onSubmitCounter(targetBudget, organizerMessage);
        router.push(`/vendor/${bookingData.vendorId}/quotes?tab=active&quote=${bookingData.bookingId}`);
      } catch {
        setError('Something went wrong sending your counter offer. Please try again.');
      }
    });
  };
  const OnCancel = () => {
    router.push(`/vendor/${bookingData.vendorId}/dashboard`);
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* CURRENT QUOTE SUMMARY */}
      <dl className="grid grid-cols-2 gap-y-4 border-y border-line py-6 sm:divide-x sm:divide-line">
        <div className="sm:pr-6">
          <dt className="text-2xs font-medium uppercase text-ink-soft">Current offer</dt>
          <dd className="mt-1 font-display text-2xl text-ink tabular-nums">{formatCurrency(currentTotal)}</dd>
        </div>
        <div className="sm:pl-6">
          <dt className="text-2xs font-medium uppercase text-ink-soft">Guest count</dt>
          <dd className="mt-1 font-display text-2xl text-ink tabular-nums">{bookingData.requirements.guestCount}</dd>
        </div>
      </dl>

      {/* TARGET BUDGET INPUT */}
      <div>
        <label htmlFor="targetBudget" className={labelClass}>
          Your proposed total (PKR)
        </label>
        <input
          id="targetBudget"
          name="targetBudget"
          type="number"
          value={targetBudget || ''}
          onChange={(e) => setTargetBudget(parseFloat(e.target.value) || 0)}
          placeholder="e.g. 130000"
          className={`${fieldClass} mt-2 tabular-nums`}
          required
        />
      </div>

      {/* NEGOTIATION MESSAGE */}
      <div>
        <label htmlFor="counterMessage" className={labelClass}>
          What would you like to adjust?
        </label>
        <textarea
          id="counterMessage"
          name="counterMessage"
          rows={4}
          placeholder="e.g. 'Removing the live dessert platter brings this within your budget.'"
          value={organizerMessage}
          onChange={(e) => setOrganizerMessage(e.target.value)}
          className={`${fieldClass} mt-2 resize-none`}
          required
        />
      </div>

      {/* ERROR HANDLING */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-ink px-3 py-2.5 text-sm font-medium text-ink"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 border-t border-line pt-6">
        <button type="button" onClick={OnCancel} className={buttonClass('ghost')}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className={buttonClass('primary')}
        >
          {isPending ? 'Sending…' : 'Send counter offer'}
        </button>
      </div>
    </form>
  );
};