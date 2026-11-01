"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { TenantBoardCard } from "@/src/features/saas/tenantBoard.types";
import { saveCustomPricingAction } from "@/src/features/saas/actions/subscriptions.action";

export function CustomPricingModal({
  open,
  onClose,
  seed,
  cards,
  agreementId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  seed: TenantBoardCard | null;
  cards: TenantBoardCard[];
  agreementId?: string | null;
  initial?: { discountPct: number | null; flatMonthly: number | null; notes: string | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const organizers = [
    ...(seed ? [seed] : []),
    ...cards.filter((c) => c.kind === "organizer" || c.kind === "department"),
  ].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  const [tenantId, setTenantId] = useState(seed?.id || "");
  const [discount, setDiscount] = useState(String(initial?.discountPct ?? ""));
  const [flat, setFlat] = useState(String(initial?.flatMonthly ?? ""));
  const [notes, setNotes] = useState(initial?.notes || "");
  const [sendEmail, setSendEmail] = useState(true);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [error, setError] = useState<string | null>(null);

  const summary = [discount ? `${discount}% discount` : null, flat ? `flat ${flat}/mo` : null]
    .filter(Boolean)
    .join(" · ");

  const confirm = () => {
    setError(null);
    start(async () => {
      const res = await saveCustomPricingAction({
        agreementId: agreementId || null,
        organizerId: tenantId,
        discountPct: discount ? Number(discount) : null,
        flatMonthly: flat ? Number(flat) : null,
        notes: notes || null,
        sendEmail,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "form" ? "Custom pricing" : "Confirm pricing"}
      description="Internal notes are never emailed."
      maxWidth="md"
      footer={
        <>
          <button type="button" className={buttonClass("ghost", "sm")} onClick={onClose}>
            Cancel
          </button>
          {step === "preview" ? (
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={() => setStep("form")}
            >
              Back
            </button>
          ) : null}
          {step === "form" ? (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={!tenantId}
              onClick={() => setStep("preview")}
            >
              Preview
            </button>
          ) : (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={pending}
              onClick={confirm}
            >
              {pending ? "Saving…" : "Confirm"}
            </button>
          )}
        </>
      }
    >
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {step === "form" ? (
        <div className="space-y-3">
          <label className="block">
            <span className={labelClass}>Organizer / department</span>
            <select
              className={fieldClass}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">Select…</option>
              {organizers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Discount %</span>
            <input
              type="number"
              min={0}
              max={100}
              className={fieldClass}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Flat monthly override</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={flat}
              onChange={(e) => setFlat(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Internal notes (not emailed)</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Email tenant (summary only)
          </label>
        </div>
      ) : (
        <p className="text-sm text-ink">
          Save agreement: <strong>{summary || "Custom pricing"}</strong>. Notes stay internal.
        </p>
      )}
    </Modal>
  );
}
