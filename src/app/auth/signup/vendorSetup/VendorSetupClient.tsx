"use client";

import React, { useState } from "react";
import EmailVerificationStep from "@/src/shared_components/auth/EmailVerificationStep";
import VendorProfileStep from "@/src/shared_components/auth/VendorProfileStep";
import { PlanSelectStep } from "@/src/features/onboarding/components/PlanSelectStep";
import { Check } from "lucide-react";
import type { VendorSetupProfileData } from "@/src/features/auth/authService";
import type { PlanRow } from "@/src/features/saas/saas.service";
import type { PlatformBillingSettings } from "@/src/features/billing/billing.service";

type ActionResult = { success: boolean; error?: string };

interface VendorSetupClientProps {
  email: string;
  initialVerified?: boolean;
  plans: PlanRow[];
  billing: PlatformBillingSettings;
  onCheckVerification: () => Promise<{ verified: boolean; email?: string }>;
  onResendVerification: () => Promise<{
    success: boolean;
    alreadyVerified?: boolean;
    error?: string;
  }>;
  onSaveProfile: (data: VendorSetupProfileData) => Promise<ActionResult>;
  onSelectFreePlan: (planKey: string) => Promise<ActionResult | void>;
  onSubmitPaidPlan: (planKey: string, formData: FormData) => Promise<ActionResult | void>;
}

const STEPS = [
  { id: 1, label: "Email" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Plan" },
] as const;

export default function VendorSetupClient({
  email,
  initialVerified = false,
  plans,
  billing,
  onCheckVerification,
  onResendVerification,
  onSaveProfile,
  onSelectFreePlan,
  onSubmitPaidPlan,
}: VendorSetupClientProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialVerified ? 2 : 1);
  const [verified, setVerified] = useState(initialVerified);

  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-4 py-8 md:px-8">
      <nav aria-label="Setup steps" className="mb-8 w-full max-w-2xl">
        <ol className="flex items-center justify-between gap-1 rounded-full border border-line bg-paper p-1.5">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const locked = step.id > 1 && !verified;
            return (
              <li key={step.id} className="flex-1">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setCurrentStep(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-ink text-ink-invert"
                      : "text-ink-soft hover:bg-muted hover:text-ink disabled:opacity-40"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold tabular-nums ${
                      isActive
                        ? "bg-paper text-ink"
                        : isCompleted
                          ? "bg-ink text-ink-invert"
                          : "bg-muted-strong text-ink-soft"
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
            initialVerified={verified}
            onCheckStatus={async () => {
              const r = await onCheckVerification();
              if (r.verified) setVerified(true);
              return r;
            }}
            onResend={onResendVerification}
            onNext={() => {
              setVerified(true);
              setCurrentStep(2);
            }}
          />
        )}

        {currentStep === 2 && verified && (
          <VendorProfileStep
            initialEmail={email}
            onSave={onSaveProfile}
            onNext={async () => {
              setCurrentStep(3);
              return { success: true };
            }}
          />
        )}

        {currentStep === 3 && verified && (
          <PlanSelectStep
            plans={plans}
            billing={billing}
            onSelectFree={onSelectFreePlan}
            onSubmitPaid={async ({ planKey, file }) => {
              const fd = new FormData();
              fd.set("screenshot", file);
              return onSubmitPaidPlan(planKey, fd);
            }}
          />
        )}
      </div>
    </div>
  );
}
