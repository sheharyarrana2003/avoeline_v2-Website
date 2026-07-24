'use client';

import React, { useState } from 'react';
import EmailVerificationStep from '@/src/shared_components/auth/EmailVerificationStep';
import OrganizerProfileStep from '@/src/shared_components/auth/OrganizerProfileStep';
import ChoosingInterestsStep from '@/src/shared_components/auth/ChoosingInterestsStep';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function SignUpOrganizerPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const steps = [
    { id: 1, label: 'Email Verification' },
    { id: 2, label: 'Organizer Profile' },
    { id: 3, label: 'Choosing Interests' },
  ];

  return (
    <div className="min-h-screen bg-[#E5E5E5] py-8 px-4 md:px-8 flex flex-col items-center justify-between font-sans">
      {/* Top Stepper Header Navigation - matching Signin/Signup color palette */}
      <div className="w-full max-w-2xl mb-6">
        <div className="bg-[#F5F5F5] border border-gray-300 shadow-sm p-1.5 rounded-full flex items-center justify-between">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <button
                key={step.id}
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

      {/* Main Active Step Content */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-2">
        {currentStep === 1 && (
          <EmailVerificationStep
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <OrganizerProfileStep
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <ChoosingInterestsStep
            onComplete={() => {
              // Completed UI state
            }}
          />
        )}
      </div>

      {/* Bottom Step Navigation Bar */}
      <div className="w-full max-w-md mt-6 flex items-center justify-between gap-4">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="flex-1 py-2.5 px-6 rounded-full border border-gray-400 bg-[#F5F5F5] text-gray-800 hover:bg-gray-200/80 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <button
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
