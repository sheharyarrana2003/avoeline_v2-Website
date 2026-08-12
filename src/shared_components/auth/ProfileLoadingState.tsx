'use client';

import React from 'react';

interface ProfileLoadingStateProps {
  title?: string;
  subtitle?: string;
  isOverlay?: boolean;
}

/**
 * The skeleton this replaced was a pixel-for-pixel copy of the profile form that
 * had already drifted out of sync with it — four fake rows against the vendor
 * form's five — so it lied about the shape of what was coming and needed
 * re-editing every time a field moved. That part is gone.
 *
 * The brand mark and its ring are not. A generic spinner says "something is
 * loading"; this says the product is loading, which is the whole point of a
 * moment the user is made to wait through.
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
      className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-line bg-paper px-10 py-12 text-center shadow-lg"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Two counter-rotating rings: the outer one carries the motion, the inner
            one is nearly still, so the mark reads as held rather than spun. */}
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-line border-t-gray-900 [animation-duration:1.1s]" />
        <span className="absolute inset-2 animate-spin rounded-full border border-transparent border-b-gray-300 [animation-direction:reverse] [animation-duration:1.8s]" />
        <svg aria-hidden="true" width="26" height="26" viewBox="0 0 48 48" fill="none" className="text-ink">
          <path
            d="M24 4L4 28C4 28 8 32 12 32C16 32 20 28 24 28C28 28 32 32 36 32C40 32 44 28 44 28L24 4Z"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="18" r="3" fill="currentColor" />
        </svg>
      </div>

      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">{subtitle}</p>
      </div>

      {/* An indeterminate bar, because a ring alone gives no sense of ongoing work
          once you have looked at it for a few seconds. */}
      <span className="h-0.5 w-28 overflow-hidden rounded-full bg-line">
        <span className="block h-full w-1/3 animate-[loading-sweep_1.4s_ease-in-out_infinite] rounded-full bg-gray-900" />
      </span>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="flex min-h-[60vh] items-center justify-center py-10">{content}</div>;
}
