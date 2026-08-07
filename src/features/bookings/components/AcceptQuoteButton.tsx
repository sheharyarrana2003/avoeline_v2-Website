'use client';

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { BookingData } from "@/src/features/bookings/types";
import type { ActionResult } from "@/src/lib/action";
import { useToast } from "@/src/shared_components/ui/Toast";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";

/**
 * Accepting a quote is a contract decision with no undo -- there is no
 * "un-accept" anywhere in this codebase -- so it asks first, and it says
 * whether it worked. Previously it did neither: the action returned void, and
 * on the vendor side it did not even revalidate, so the write landed and the
 * screen sat there looking broken.
 */
export function AcceptQuoteButton({
    quote,
    accept_quote,
}: {
    quote: BookingData;
    accept_quote: (booking: BookingData) => Promise<ActionResult>;
}) {
    const [isPending, startTransition] = useTransition();
    const [confirming, setConfirming] = useState(false);
    const toast = useToast();

    const run = () => {
        setConfirming(false);
        startTransition(async () => {
            const res = await accept_quote(quote);
            if (res?.success) toast.success("Quote accepted. The vendor has been notified.");
            else toast.error(res?.error ?? "Could not accept the quote. Please try again.");
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={isPending}
                aria-busy={isPending}
                className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                <Check className="h-4 w-4" aria-hidden="true" />
                {isPending ? "Accepting…" : "Accept Quote"}
            </button>

            <ConfirmDialog
                open={confirming}
                tone="default"
                title="Accept this quote?"
                description="This confirms the booking at the quoted price and notifies the other party. It cannot be undone."
                confirmLabel="Accept quote"
                busy={isPending}
                onConfirm={run}
                onCancel={() => setConfirming(false)}
            />
        </>
    );
}
