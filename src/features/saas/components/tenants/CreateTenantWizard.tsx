"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { filterPlansForAudience } from "@/src/features/saas/tenantBoard.filters";
import type {
  InstituteOption,
  PlanOption,
  TenantType,
} from "@/src/features/saas/tenantBoard.types";
import { createTenantAccountAction } from "@/src/features/saas/actions/tenants.action";

const TYPES: { value: TenantType; label: string; hint: string }[] = [
  { value: "department", label: "Department", hint: "Manages clubs under one org" },
  { value: "organizer", label: "Organizer", hint: "Runs events on their own plan" },
  { value: "vendor", label: "Vendor", hint: "Marketplace vendor account" },
];

export function CreateTenantWizard({
  plans,
  institutes,
  open,
  onClose,
}: {
  plans: PlanOption[];
  institutes: InstituteOption[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [tenantType, setTenantType] = useState<TenantType | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [planKey, setPlanKey] = useState("free");
  const [accessMode, setAccessMode] = useState<"invite" | "temp_password">("invite");
  const [password, setPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultPw, setResultPw] = useState<string | null>(null);

  const planOptions = useMemo(
    () => (tenantType ? filterPlansForAudience(plans, tenantType) : []),
    [plans, tenantType],
  );

  const reset = () => {
    setStep(1);
    setTenantType(null);
    setName("");
    setEmail("");
    setPhone("");
    setInstituteId("");
    setInstituteName("");
    setPlanKey("free");
    setAccessMode("invite");
    setPassword("");
    setSendEmail(true);
    setError(null);
    setResultPw(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!tenantType) return;
    setError(null);
    start(async () => {
      const res = await createTenantAccountAction({
        tenantType,
        name,
        email,
        phone: phone || null,
        planKey,
        instituteId: instituteId || null,
        instituteName: instituteName || null,
        accessMode,
        password: accessMode === "temp_password" ? password || null : null,
        sendEmail,
        idempotencyKey: `create-${email}-${Date.now()}`,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      if (res.data.temporaryPassword) {
        setResultPw(res.data.temporaryPassword);
        setStep(4);
      } else {
        close();
        router.refresh();
      }
    });
  };

  if (resultPw) {
    return (
      <Modal
        open={open}
        onClose={() => {
          close();
          router.refresh();
        }}
        title="Temporary password — copy now"
        description="This password is shown once and is never emailed or logged."
        maxWidth="md"
        footer={
          <button
            type="button"
            className={buttonClass("primary")}
            onClick={() => {
              close();
              router.refresh();
            }}
          >
            Done
          </button>
        }
      >
        <p className="rounded-lg border border-warning-line bg-warning-soft px-3 py-2 font-mono text-sm text-ink">
          {resultPw}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        step === 1 ? "Create account" : step === 2 ? "Details" : step === 3 ? "Access" : "Preview"
      }
      description={
        step === 1
          ? "Choose who you are provisioning."
          : step === 4
            ? "Confirm before creating. Passwords are never emailed."
            : undefined
      }
      maxWidth="lg"
      footer={
        <>
          <button type="button" className={buttonClass("ghost", "sm")} onClick={close}>
            Cancel
          </button>
          {step > 1 ? (
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
            >
              Back
            </button>
          ) : null}
          {step < 4 ? (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={
                (step === 1 && !tenantType) ||
                (step === 2 && (!name.trim() || !email.trim())) ||
                (step === 3 &&
                  accessMode === "temp_password" &&
                  password.length > 0 &&
                  password.length < 8)
              }
              onClick={() => {
                if (
                  step === 3 &&
                  planOptions.length &&
                  !planOptions.some((p) => p.key === planKey)
                ) {
                  setPlanKey(planOptions[0]!.key);
                }
                setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={pending}
              onClick={submit}
            >
              {pending ? "Creating…" : "Create account"}
            </button>
          )}
        </>
      }
    >
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      {step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTenantType(opt.value)}
              className={`rounded-xl border p-4 text-left transition ${
                tenantType === opt.value
                  ? "border-ink bg-muted"
                  : "border-line hover:border-line-loud"
              }`}
            >
              <p className="font-medium text-ink">{opt.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{opt.hint}</p>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <label className="block">
            <span className={labelClass}>Name</span>
            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {tenantType === "department" ? (
            <>
              <label className="block">
                <span className={labelClass}>Phone</span>
                <input
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Institute</span>
                <select
                  className={fieldClass}
                  value={instituteId}
                  onChange={(e) => {
                    setInstituteId(e.target.value);
                    if (e.target.value) setInstituteName("");
                  }}
                >
                  <option value="">— Select or add new —</option>
                  {institutes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              {!instituteId ? (
                <label className="block">
                  <span className={labelClass}>Add new institute</span>
                  <input
                    className={fieldClass}
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    placeholder="University name"
                  />
                </label>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          {tenantType !== "vendor" || planOptions.length ? (
            <label className="block">
              <span className={labelClass}>Plan</span>
              <select
                className={fieldClass}
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value)}
              >
                {planOptions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <fieldset className="space-y-2">
            <legend className={labelClass}>Access</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={accessMode === "invite"}
                onChange={() => setAccessMode("invite")}
              />
              Invite link (recommended)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={accessMode === "temp_password"}
                onChange={() => setAccessMode("temp_password")}
              />
              Temporary password (shown once — never emailed)
            </label>
          </fieldset>
          {accessMode === "temp_password" ? (
            <label className="block">
              <span className={labelClass}>Password (optional — we can generate one)</span>
              <input
                type="text"
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="off"
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            Email tenant (account ready / invite — no password)
          </label>
        </div>
      ) : null}

      {step === 4 ? (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Type</dt>
            <dd className="capitalize text-ink">{tenantType}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Name</dt>
            <dd className="text-ink">{name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Email</dt>
            <dd className="text-ink">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Plan</dt>
            <dd className="text-ink">{planKey}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Access</dt>
            <dd className="text-ink">{accessMode === "invite" ? "Invite" : "Temp password"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Email tenant</dt>
            <dd className="text-ink">{sendEmail ? "Yes" : "No"}</dd>
          </div>
        </dl>
      ) : null}
    </Modal>
  );
}
