'use client';

import React, { useState } from 'react';
import EmailVerificationStep from '@/src/shared_components/auth/EmailVerificationStep';
import OrganizerProfileStep from '@/src/shared_components/auth/OrganizerProfileStep';
import { Check } from 'lucide-react';
import type { OrganizerSetupProfileData } from '@/src/features/auth/authService';

type ActionResult = { success: boolean; error?: string };

interface OrganizerSetupClientProps {
  email: string;
  initialVerified?: boolean;
  onCheckVerification: () => Promise<{ verified: boolean; email?: string }>;
  onResendVerification: () => Promise<{ success: boolean; alreadyVerified?: boolean; error?: string }>;
  onSaveProfile: (data: OrganizerSetupProfileData) => Promise<ActionResult>;
  /** Marks setup complete and redirects to the dashboard. */
  onFinishSetup: () => Promise<ActionResult | void>;
}

const STEPS = [
  { id: 1, label: 'Email Verification' },
  { id: 2, label: 'Organizer Profile' },
] as const;

export default function OrganizerSetupClient({
  email,
  initialVerified = false,
  onCheckVerification,
  onResendVerification,
  onSaveProfile,
  onFinishSetup,
}: OrganizerSetupClientProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-4 py-8 md:px-8">
      {/* The only navigation. The Previous/Next pair that used to sit at the foot of
          the page duplicated these tabs on a two-step flow — one of the two was
          always disabled — and the enabled one skipped past verification silently. */}
      <nav aria-label="Setup steps" className="mb-8 w-full max-w-2xl">
        <ol className="flex items-center justify-between gap-1 rounded-full border border-line bg-paper p-1.5">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <li key={step.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-ink text-ink-invert'
                      : 'text-ink-soft hover:bg-muted hover:text-ink'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold tabular-nums ${
                      isActive
                        ? 'bg-paper text-ink'
                        : isCompleted
                          ? 'bg-ink text-ink-invert'
                          : 'bg-muted-strong text-ink-soft'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.id}
                  </span>
                  {step.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {currentStep === 1 && (
          <EmailVerificationStep
            email={email}
            initialVerified={initialVerified}
            onCheckStatus={onCheckVerification}
            onResend={onResendVerification}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          // Both handlers go straight through: the step renders their errors next to
          // the button that triggered them.
          <OrganizerProfileStep
            initialEmail={email}
            onSave={onSaveProfile}
            onNext={onFinishSetup}
          />
        )}
      </div>
    </div>
  );
}
