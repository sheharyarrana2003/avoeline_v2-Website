"use client";

import { useState } from "react";
import { Landmark, Smartphone, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { PlatformBillingSettings } from "@/src/features/billing/billing.service";
import { saveBillingSettingsAction } from "@/src/features/billing/actions/billing.action";

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-2xs uppercase text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-all text-sm text-ink">{value}</dd>
    </div>
  );
}

function BankForm({ settings, formId }: { settings: PlatformBillingSettings; formId: string }) {
  return (
    <form id={formId} action={saveBillingSettingsAction} className="space-y-3">
      <input type="hidden" name="section" value="bank" />
      {(
        [
          ["bankName", "Bank name", settings.bankName],
          ["accountTitle", "Account title", settings.accountTitle],
          ["accountNumber", "Account number", settings.accountNumber],
          ["iban", "IBAN", settings.iban],
          ["branch", "Branch", settings.branch],
          ["currency", "Currency", settings.currency || "PKR"],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="flex flex-col gap-1.5">
          <label htmlFor={`bank-${name}`} className={labelClass}>
            {label}
          </label>
          <input id={`bank-${name}`} name={name} defaultValue={value} className={fieldClass} />
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bank-instructions" className={labelClass}>
          Instructions
        </label>
        <textarea
          id="bank-instructions"
          name="instructions"
          rows={4}
          defaultValue={settings.instructions}
          className={fieldClass}
        />
      </div>
    </form>
  );
}

function WalletForm({
  settings,
  kind,
  formId,
}: {
  settings: PlatformBillingSettings;
  kind: "jazzcash" | "easypaisa";
  formId: string;
}) {
  const label = kind === "jazzcash" ? "JazzCash number" : "EasyPaisa number";
  const value = kind === "jazzcash" ? settings.jazzcash : settings.easypaisa;
  return (
    <form id={formId} action={saveBillingSettingsAction} className="space-y-3">
      <input type="hidden" name="section" value={kind} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${kind}-value`} className={labelClass}>
          {label}
        </label>
        <input
          id={`${kind}-value`}
          name={kind}
          defaultValue={value}
          className={fieldClass}
          placeholder="03XXXXXXXXX"
        />
      </div>
    </form>
  );
}

export function BillingSettingsBoard({ settings }: { settings: PlatformBillingSettings }) {
  const [bankOpen, setBankOpen] = useState(false);
  const [jazzOpen, setJazzOpen] = useState(false);
  const [easyOpen, setEasyOpen] = useState(false);

  const hasBank = Boolean(
    settings.bankName ||
    settings.accountTitle ||
    settings.accountNumber ||
    settings.iban ||
    settings.branch,
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-ink">Bank account</h2>
            <p className="text-sm text-ink-soft">Shown on paid-plan checkout for bank transfer.</p>
          </div>
          <button
            type="button"
            onClick={() => setBankOpen(true)}
            className={buttonClass("primary", "sm")}
          >
            {hasBank ? "Edit bank" : "Add bank"}
          </button>
        </div>

        {hasBank ? (
          <Card tone="flat">
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2 text-ink">
                <Landmark className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <p className="font-medium">{settings.bankName || "Bank account"}</p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Account title" value={settings.accountTitle} />
                <DetailRow label="Account number" value={settings.accountNumber} />
                <DetailRow label="IBAN" value={settings.iban} />
                <DetailRow label="Branch" value={settings.branch} />
                <DetailRow label="Currency" value={settings.currency} />
              </dl>
              {settings.instructions ? (
                <p className="border-t border-line pt-3 text-sm text-ink-soft">
                  {settings.instructions}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            No bank account yet. Add one so organizers and vendors can pay by transfer.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card tone="flat">
          <CardBody className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-ink-soft" aria-hidden="true" />
                <h2 className="font-display text-base text-ink">JazzCash</h2>
              </div>
              <button
                type="button"
                onClick={() => setJazzOpen(true)}
                className={buttonClass("secondary", "sm")}
              >
                {settings.jazzcash ? "Edit" : "Add"}
              </button>
            </div>
            {settings.jazzcash ? (
              <p className="text-sm text-ink">{settings.jazzcash}</p>
            ) : (
              <p className="text-sm text-ink-soft">Not set</p>
            )}
          </CardBody>
        </Card>

        <Card tone="flat">
          <CardBody className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-ink-soft" aria-hidden="true" />
                <h2 className="font-display text-base text-ink">EasyPaisa</h2>
              </div>
              <button
                type="button"
                onClick={() => setEasyOpen(true)}
                className={buttonClass("secondary", "sm")}
              >
                {settings.easypaisa ? "Edit" : "Add"}
              </button>
            </div>
            {settings.easypaisa ? (
              <p className="text-sm text-ink">{settings.easypaisa}</p>
            ) : (
              <p className="text-sm text-ink-soft">Not set</p>
            )}
          </CardBody>
        </Card>
      </section>

      {bankOpen ? (
        <Modal
          open
          onClose={() => setBankOpen(false)}
          title={hasBank ? "Edit bank" : "Add bank"}
          description="Bank transfer details for plan checkout."
          maxWidth="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => setBankOpen(false)}
                className={buttonClass("ghost", "sm")}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="billing-bank-form"
                className={buttonClass("primary", "sm")}
              >
                Save bank
              </button>
            </>
          }
        >
          <BankForm settings={settings} formId="billing-bank-form" />
        </Modal>
      ) : null}

      {jazzOpen ? (
        <Modal
          open
          onClose={() => setJazzOpen(false)}
          title="JazzCash"
          maxWidth="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setJazzOpen(false)}
                className={buttonClass("ghost", "sm")}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="billing-jazz-form"
                className={buttonClass("primary", "sm")}
              >
                Save
              </button>
            </>
          }
        >
          <WalletForm settings={settings} kind="jazzcash" formId="billing-jazz-form" />
        </Modal>
      ) : null}

      {easyOpen ? (
        <Modal
          open
          onClose={() => setEasyOpen(false)}
          title="EasyPaisa"
          maxWidth="sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setEasyOpen(false)}
                className={buttonClass("ghost", "sm")}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="billing-easy-form"
                className={buttonClass("primary", "sm")}
              >
                Save
              </button>
            </>
          }
        >
          <WalletForm settings={settings} kind="easypaisa" formId="billing-easy-form" />
        </Modal>
      ) : null}
    </div>
  );
}
