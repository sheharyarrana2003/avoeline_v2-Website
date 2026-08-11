'use client';

import React from 'react';

interface ProfileLoadingStateProps {
  title?: string;
  subtitle?: string;
  isOverlay?: boolean;
}

export default function ProfileLoadingState({
  title = 'Setting Up Profile',
  subtitle = 'Please wait while we prepare your account details...',
  isOverlay = false,
}: ProfileLoadingStateProps) {
  const content = (
    <div className="w-full flex flex-col items-center justify-center font-sans">
      {/* Header Skeleton / Title */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-2">
          {/* Subtle Logo Emblem with rotating ring */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-t-black border-r-gray-300 border-b-gray-300 border-l-gray-300 animate-spin" />
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48" fill="none" className="text-black">
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
        </div>
        <h2 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight">{title}</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">{subtitle}</p>
      </div>

      {/* Main Skeleton Card - Matching bg-gray-100 */}
      <div className="bg-gray-100 w-full max-w-3xl md:max-w-4xl rounded-[28px] p-8 md:p-12 border border-gray-300/60 shadow-sm flex flex-col items-center">
        {/* Profile Avatar Skeleton */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-28 h-28 rounded-full bg-gray-300/70 animate-pulse border-2 border-gray-300 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gray-400/50" />
          </div>
          <div className="h-4 w-28 bg-gray-300/80 rounded-full animate-pulse mt-4" />
        </div>

        {/* 2-Column Form Fields Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8">
          {/* Column 1 */}
          <div className="space-y-4">
            <div className="h-4 w-36 bg-gray-300/90 rounded-xs animate-pulse mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-16 bg-gray-300/60 rounded-xs ml-3" />
                <div className="h-10 w-full bg-gray-300/50 rounded-full animate-pulse" />
              </div>
            ))}
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div className="h-4 w-36 bg-gray-300/90 rounded-xs animate-pulse mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-16 bg-gray-300/60 rounded-xs ml-3" />
                <div className="h-10 w-full bg-gray-300/50 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Buttons Skeleton */}
        <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-11 bg-gray-300/70 rounded-full animate-pulse" />
          <div className="h-11 bg-gray-300/90 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-200/90 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 py-10 px-4 md:px-8 flex items-center justify-center">
      {content}
    </div>
  );
}
