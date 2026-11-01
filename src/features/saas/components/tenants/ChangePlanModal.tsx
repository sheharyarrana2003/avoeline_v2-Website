"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { filterPlansForAudience } from "@/src/features/saas/tenantBoard.filters";
import type { PlanOption, TenantBoardCard } from "@/src/features/saas/tenantBoard.types";
import { changePlanAction } from "@/src/features/saas/actions/subscriptions.action";

export function ChangePlanModal({
  open,
  onClose,
  plans,
  seed,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  plans: PlanOption[];
  seed: TenantBoardCard | null;
  cards: TenantBoardCard[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tenantId, setTenantId] = useState(seed?.id || "");
  const [toPlan, setToPlan] = useState("");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [includeReason, setIncludeReason] = useState(true);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [preview, setPreview] = useState<{
    fromPlan: string;
    toPlan: string;
    toPlanName: string;
    isDowngrade: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => cards.find((c) => c.id === tenantId) || seed,
    [cards, tenantId, seed],
  );

  const planOptions = useMemo(
    () => (selected ? filterPlansForAudience(plans, selected.kind) : plans),
    [plans, selected],
  );

  const loadPreview = () => {
    if (!selected || !toPlan) return;
    setError(null);
    start(async () => {
      const res = await changePlanAction({
        tenantId: selected.id,
        tenantKind: selected.kind,
        toPlan,
        reason: reason || null,
        sendEmail,
        includeReason,
        previewOnly: true,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      const data = res.data as {
        fromPlan: string;
        toPlan: string;
        toPlanName: string;
        isDowngrade: boolean;
      };
      setPreview(data);
      setStep("preview");
    });
  };

  const confirm = () => {
    if (!selected || !toPlan) return;
    setError(null);
    start(async () => {
      const res = await changePlanAction({
        tenantId: selected.id,
        tenantKind: selected.kind,
        toPlan,
        reason: reason || null,
        sendEmail,
        includeReason,
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
      title={step === "form" ? "Change plan" : "Confirm plan change"}
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
              disabled={!tenantId || !toPlan || pending}
              onClick={loadPreview}
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
            <span className={labelClass}>Tenant</span>
            <select
              className={fieldClass}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">Select…</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>New plan</span>
            <select
              className={fieldClass}
              value={toPlan}
              onChange={(e) => setToPlan(e.target.value)}
            >
              <option value="">Select…</option>
              {planOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Reason (required on downgrade)</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Email tenant
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeReason}
              onChange={(e) => setIncludeReason(e.target.checked)}
            />
            Include reason in email
          </label>
        </div>
      ) : preview ? (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">From</dt>
            <dd>{preview.fromPlan}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">To</dt>
            <dd>{preview.toPlanName}</dd>
          </div>
          {preview.isDowngrade ? (
            <p className="rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-xs text-warning">
              This is a downgrade. Reason will be recorded.
            </p>
          ) : null}
        </dl>
      ) : null}
    </Modal>
  );
}
