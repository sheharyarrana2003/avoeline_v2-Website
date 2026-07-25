'use client';

import React, { useState } from 'react';
import EmailVerificationStep from '@/src/shared_components/auth/EmailVerificationStep';
import VendorProfileStep from '@/src/shared_components/auth/VendorProfileStep';
import ChoosingInterestsStep from '@/src/shared_components/auth/ChoosingInterestsStep';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { VendorSetupProfileData } from '@/src/features/auth/authService';

type ActionResult = { success: boolean; error?: string };

interface VendorSetupClientProps {
  email: string;
  onSaveProfile: (data: VendorSetupProfileData) => Promise<ActionResult>;
  onCompleteInterests: (interests: string[]) => Promise<ActionResult>;
}

export default function VendorSetupClient({
  email,
  onSaveProfile,
  onCompleteInterests,
}: VendorSetupClientProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, label: 'Email Verification' },
    { id: 2, label: 'Vendor Profile' },
    { id: 3, label: 'Choosing Interests' },
  ];

  return (
    <div className="min-h-screen bg-[#E5E5E5] py-8 px-4 md:px-8 flex flex-col items-center justify-between font-sans">
      <div className="w-full max-w-2xl mb-6">
        <div className="bg-[#F5F5F5] border border-gray-300 shadow-sm p-1.5 rounded-full flex items-center justify-between">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex-1 py-2 px-4 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-sm font-bold scale-[1.01]'
                    : isCompleted
                    ? 'text-gray-900 font-semibold hover:bg-gray-200/60'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/40'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-black'
                      : isCompleted
                      ? 'bg-black text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </span>
                <span className="inline">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-full px-4 py-2">
          {error}
        </p>
      )}

      <div className="w-full flex-1 flex flex-col items-center justify-center my-2">
        {currentStep === 1 && (
          <EmailVerificationStep
            email={email}
            onNext={() => {
              setError(null);
              setCurrentStep(2);
            }}
          />
        )}

        {currentStep === 2 && (
          <VendorProfileStep
            initialEmail={email}
            onSave={async (data) => {
              setError(null);
              const res = await onSaveProfile(data);
              if (!res.success) {
                setError(res.error || 'Failed to save vendor profile.');
                return false;
              }
              return true;
            }}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <ChoosingInterestsStep
            onComplete={async (selectedInterests) => {
              setError(null);
              const res = await onCompleteInterests(selectedInterests);
              if (!res.success) {
                setError(res.error || 'Failed to save interests.');
                return false;
              }
              return true;
            }}
          />
        )}
      </div>

      <div className="w-full max-w-md mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="flex-1 py-2.5 px-6 rounded-full border border-gray-400 bg-[#F5F5F5] text-gray-800 hover:bg-gray-200/80 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1))}
          disabled={currentStep === 3}
          className="flex-1 py-2.5 px-6 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
