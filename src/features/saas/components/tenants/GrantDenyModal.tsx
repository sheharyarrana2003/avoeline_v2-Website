"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import {
  MODULE_LABELS,
  ALL_MODULE_KEYS,
  type ModuleKey,
} from "@/src/features/permissions/moduleKeys";
import type { ClubOption, TenantBoardCard } from "@/src/features/saas/tenantBoard.types";
import { grantDenyClearAction } from "@/src/features/saas/actions/subscriptions.action";

export type StagedGrantChange = {
  moduleKey: ModuleKey;
  effect: "plan_default" | "grant" | "deny";
  expiresAt?: string;
};

export function GrantDenyModal({
  open,
  onClose,
  seed,
  cards,
  clubs,
  initialChanges,
}: {
  open: boolean;
  onClose: () => void;
  seed: TenantBoardCard | null;
  cards: TenantBoardCard[];
  clubs: ClubOption[];
  /** From Manage drawer Review changes — multi-feature batch. */
  initialChanges?: StagedGrantChange[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const seeded = useMemo(
    () =>
      (initialChanges || [])
        .filter((c) => c.effect !== "plan_default")
        .map((c) => ({
          moduleKey: c.moduleKey,
          effect: (c.effect === "deny" ? "deny" : "grant") as "grant" | "deny" | "clear",
          expiresAt: c.expiresAt || "",
        })),
    [initialChanges],
  );
  const batchMode = seeded.length > 0;
  const [tenantId, setTenantId] = useState(seed?.id || "");
  const [targetOrgId, setTargetOrgId] = useState(seed?.orgId || "");
  const [moduleKey, setModuleKey] = useState<ModuleKey>(
    seeded[0]?.moduleKey || ALL_MODULE_KEYS[0]!,
  );
  const [effect, setEffect] = useState<"grant" | "deny" | "clear">(seeded[0]?.effect || "grant");
  const [expiresAt, setExpiresAt] = useState(seeded[0]?.expiresAt || "");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [includeReason, setIncludeReason] = useState(true);
  const [step, setStep] = useState<"form" | "preview">(batchMode ? "preview" : "form");
  const [error, setError] = useState<string | null>(null);

  const selected = cards.find((c) => c.id === tenantId) || seed;
  const deptClubs = clubs.filter((c) => c.parentId === selected?.orgId);

  const changePayload = () => {
    if (batchMode) {
      return seeded.map((c) => ({
        moduleKey: c.moduleKey,
        effect: c.effect,
        expiresAt:
          c.effect === "clear" || !c.expiresAt ? null : new Date(c.expiresAt).toISOString(),
      }));
    }
    const iso = expiresAt ? new Date(expiresAt).toISOString() : null;
    return [
      {
        moduleKey,
        effect,
        expiresAt: effect === "clear" ? null : iso,
      },
    ];
  };

  const run = (previewOnly: boolean) => {
    setError(null);
    start(async () => {
      const res = await grantDenyClearAction({
        changes: changePayload(),
        organizerId: selected?.kind === "department" && targetOrgId ? null : tenantId || null,
        targetOrgId: selected?.kind === "department" ? targetOrgId || selected.orgId : null,
        reason: reason || null,
        sendEmail,
        includeReason,
        previewOnly,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      if (previewOnly) {
        setStep("preview");
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
      title={step === "form" ? "Grant / deny feature" : "Confirm access change"}
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
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            disabled={pending || !tenantId}
            onClick={() => run(step === "form")}
          >
            {pending ? "Working…" : step === "form" ? "Preview" : "Confirm"}
          </button>
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
          {selected?.kind === "department" ? (
            <label className="block">
              <span className={labelClass}>Scope</span>
              <select
                className={fieldClass}
                value={targetOrgId}
                onChange={(e) => setTargetOrgId(e.target.value)}
              >
                <option value={selected.orgId || ""}>Whole department</option>
                {deptClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    Club: {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className={labelClass}>Feature</span>
            <select
              className={fieldClass}
              value={moduleKey}
              onChange={(e) => setModuleKey(e.target.value as ModuleKey)}
            >
              {ALL_MODULE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {MODULE_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {(["grant", "deny", "clear"] as const).map((e) => (
              <button
                key={e}
                type="button"
                className={buttonClass(effect === e ? "primary" : "secondary", "sm")}
                onClick={() => setEffect(e)}
              >
                {e}
              </button>
            ))}
          </div>
          {effect !== "clear" ? (
            <label className="block">
              <span className={labelClass}>Expiry</span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
          ) : null}
          <label className="block">
            <span className={labelClass}>
              Reason {effect === "deny" || effect === "clear" ? "(required)" : ""}
            </span>
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
      ) : (
        <div className="space-y-2 text-sm text-ink">
          <p>
            Apply {batchMode ? seeded.length : 1} access change
            {batchMode && seeded.length !== 1 ? "s" : ""} for {selected?.name || "tenant"}:
          </p>
          <ul className="list-inside list-disc text-ink-soft">
            {(batchMode ? seeded : [{ moduleKey, effect, expiresAt }]).map((c) => (
              <li key={`${c.moduleKey}-${c.effect}`}>
                {c.effect} <strong className="text-ink">{MODULE_LABELS[c.moduleKey]}</strong>
                {c.expiresAt ? ` until ${c.expiresAt}` : ""}
              </li>
            ))}
          </ul>
          {batchMode ? (
            <label className="mt-3 block">
              <span className={labelClass}>Reason (required for deny/clear)</span>
              <textarea
                className={fieldClass}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
