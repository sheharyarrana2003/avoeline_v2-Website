"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { buttonClass } from "@/src/lib/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  step1: ReactNode;
  preview: ReactNode;
  /** Form id that wraps step1 fields (must include hidden inputs for submit). */
  formId: string;
  confirmLabel?: string;
  nextLabel?: string;
  canProceed?: boolean;
};

/**
 * Two-step modal: form → preview summary → confirm (submit via form=).
 */
export function TwoStepModal({
  open,
  onClose,
  title,
  description,
  step1,
  preview,
  formId,
  confirmLabel = "Confirm",
  nextLabel = "Continue",
  canProceed = true,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${title}${step === 2 ? " — review" : ""}`}
      description={description}
      maxWidth="lg"
      footer={
        step === 1 ? (
          <>
            <button type="button" className={buttonClass("ghost", "sm")} onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={!canProceed}
              onClick={() => setStep(2)}
            >
              {nextLabel}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" form={formId} className={buttonClass("primary", "sm")}>
              {confirmLabel}
            </button>
          </>
        )
      }
    >
      {step === 1 ? step1 : <div className="space-y-3 text-sm text-ink">{preview}</div>}
    </Modal>
  );
}
