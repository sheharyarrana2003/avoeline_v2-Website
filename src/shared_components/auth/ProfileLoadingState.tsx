'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProfileLoadingStateProps {
  title?: string;
  subtitle?: string;
  isOverlay?: boolean;
}

/**
 * Was a pixel-for-pixel skeleton of the profile form — two columns of fake
 * fields that had already drifted out of sync with the real one (four rows
 * against the vendor form's five). A skeleton that lies about the shape of what
 * is coming is worse than a spinner, and it had to be re-edited every time a
 * field moved. This says the same thing in a tenth of the markup.
 *
 * No px-* / bg-* on the inline variant: it renders inside route shells that
 * already supply both.
 */
export default function ProfileLoadingState({
  title = 'Setting Up Profile',
  subtitle = 'Please wait while we prepare your account details...',
  isOverlay = false,
}: ProfileLoadingStateProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-line bg-paper px-8 py-10 text-center"
    >
      <Loader2 className="h-8 w-8 animate-spin text-ink" aria-hidden="true" />
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <p className="max-w-xs text-xs text-ink-soft">{subtitle}</p>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 p-4 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return <div className="flex min-h-[60vh] items-center justify-center py-10">{content}</div>;
}
