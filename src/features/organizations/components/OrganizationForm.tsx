"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { MediaUploadField } from "@/src/features/media/MediaUploadField";
import { saveOrganization } from "../actions/organizations.action";
import { BenefitChips } from "./BenefitChips";
import {
  CONTRIBUTION_KINDS,
  DEFAULT_BENEFITS,
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_META,
  PARTNER_TYPE_DEFINITIONS,
  PARTNERSHIP_KINDS,
  type EventOrganization,
  type OrganizationType,
} from "../types";

export function OrganizationForm({
  eventId,
  sponsorTiers,
  editing,
  onDone,
  tracks = [],
  isHackathon = false,
  partnerTypes = [],
  formId,
  hideSubmit = false,
  onSuccess,
}: {
  eventId: string;
  sponsorTiers: string[];
  editing?: EventOrganization;
  onDone?: string;
  tracks?: { id: string; name: string }[];
  isHackathon?: boolean;
  partnerTypes?: { label: string; description: string }[];
  formId?: string;
  hideSubmit?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(saveOrganization, null);
  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state?.success, onSuccess]);
  const [type, setType] = useState<OrganizationType>(editing?.type ?? "sponsor");
  const [contribution, setContribution] = useState(
    editing?.contributionKind || CONTRIBUTION_KINDS[0],
  );
  const [partnerKind, setPartnerKind] = useState(editing?.partnershipKind || PARTNERSHIP_KINDS[0]);
  const [pasteUrl, setPasteUrl] = useState(false);
  const allPartnerLabels = [
    ...PARTNERSHIP_KINDS,
    ...partnerTypes
      .map((p) => p.label)
      .filter((l) => !(PARTNERSHIP_KINDS as readonly string[]).includes(l)),
  ];
  const definitions = [
    ...Object.entries(PARTNER_TYPE_DEFINITIONS).map(([label, description]) => ({
      label,
      description,
    })),
    ...partnerTypes.filter((p) => !(p.label in PARTNER_TYPE_DEFINITIONS)),
  ];

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="eventId" value={eventId} />
      {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success={editing ? "Saved." : "Added."} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-type" className={labelClass}>
          Type
        </label>
        <select
          id="org-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as OrganizationType)}
          className={fieldClass}
        >
          {ORGANIZATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {ORGANIZATION_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-soft">{ORGANIZATION_TYPE_META[type].description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-name" className={labelClass}>
            Name
          </label>
          <input
            id="org-name"
            name="name"
            defaultValue={editing?.name}
            required
            maxLength={120}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-website" className={labelClass}>
            Website
          </label>
          <input
            id="org-website"
            name="websiteUrl"
            type="url"
            defaultValue={editing?.websiteUrl}
            placeholder="https://"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Logo</label>
        <MediaUploadField
          name="logoUrl"
          kind={
            type === "collaborator"
              ? "collaborator_logo"
              : type === "partner"
                ? "partner_logo"
                : "sponsor_logo"
          }
          eventId={eventId}
          bucket="sponsor-logos"
          accept="image/*"
          label="Upload logo"
          initialUrls={editing?.logoUrl ? [editing.logoUrl] : []}
          buttonClassName="relative flex h-20 w-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line-loud bg-canvas text-ink-soft transition hover:border-ink disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setPasteUrl((v) => !v)}
          className="self-start text-xs font-medium text-ink-soft hover:text-ink"
        >
          {pasteUrl ? "Hide URL field" : "or paste a logo URL instead"}
        </button>
        {pasteUrl ? (
          <input
            id="org-logo"
            name="logoUrlPaste"
            type="url"
            defaultValue={editing?.logoUrl}
            placeholder="https://"
            className={fieldClass}
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-contact-name" className={labelClass}>
            Contact
          </label>
          <input
            id="org-contact-name"
            name="contactName"
            defaultValue={editing?.contactName}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-contact-email" className={labelClass}>
            Email
          </label>
          <input
            id="org-contact-email"
            name="contactEmail"
            type="email"
            defaultValue={editing?.contactEmail}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-contact-phone" className={labelClass}>
            Phone
          </label>
          <input
            id="org-contact-phone"
            name="contactPhone"
            defaultValue={editing?.contactPhone}
            className={fieldClass}
          />
        </div>
      </div>

      {type === "sponsor" ? (
        <div className="flex flex-col gap-5 rounded-xl border border-line p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-tier" className={labelClass}>
                Tier
              </label>
              <select
                id="org-tier"
                name="tier"
                defaultValue={editing?.tier ?? sponsorTiers[0]}
                className={fieldClass}
              >
                {sponsorTiers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-soft">
                Higher tiers appear first and larger on the public page.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-value" className={labelClass}>
                Contract value
              </label>
              <input
                id="org-value"
                name="contractValue"
                inputMode="numeric"
                defaultValue={editing?.contractValue ? String(editing.contractValue) : ""}
                placeholder="0"
                className={`${fieldClass} tabular-nums`}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-pay-status" className={labelClass}>
                Payment
              </label>
              <select
                id="org-pay-status"
                name="paymentStatus"
                defaultValue={editing?.paymentStatus ?? "pending"}
                className={fieldClass}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-amount-received" className={labelClass}>
                Amount received
              </label>
              <input
                id="org-amount-received"
                name="amountReceived"
                inputMode="numeric"
                defaultValue={editing?.amountReceived ? String(editing.amountReceived) : ""}
                className={`${fieldClass} tabular-nums`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-received-on" className={labelClass}>
                Received on
              </label>
              <input
                id="org-received-on"
                name="receivedOn"
                type="date"
                defaultValue={editing?.receivedOn ?? ""}
                className={fieldClass}
              />
            </div>
          </div>

          <BenefitChips
            name="benefits"
            initial={
              editing?.benefits.length ? editing.benefits.map((b) => b.label) : DEFAULT_BENEFITS
            }
          />

          {isHackathon && tracks.length ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-track" className={labelClass}>
                Dedicate to a competition (optional)
              </label>
              <select
                id="org-track"
                name="trackId"
                defaultValue={editing?.trackId ?? ""}
                className={fieldClass}
              >
                <option value="">Whole event</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {type === "collaborator" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-contribution" className={labelClass}>
              Contribution
            </label>
            <select
              id="org-contribution"
              name="contributionKind"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              className={fieldClass}
              required
            >
              {CONTRIBUTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          {contribution === "Other" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-contribution-custom" className={labelClass}>
                Custom contribution
              </label>
              <input
                id="org-contribution-custom"
                name="contributionCustom"
                defaultValue={editing?.contributionCustom}
                required
                className={fieldClass}
                placeholder="Describe the contribution"
              />
            </div>
          ) : (
            <input type="hidden" name="contributionCustom" value="" />
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-collab-terms" className={labelClass}>
              Collaboration terms
            </label>
            <textarea
              id="org-collab-terms"
              name="collaborationTerms"
              rows={4}
              required
              defaultValue={editing?.collaborationTerms}
              className={`${fieldClass} resize-y`}
              placeholder="What each side commits to, timelines, deliverables…"
            />
          </div>
        </div>
      ) : null}

      {type === "partner" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-kind" className={labelClass}>
              Partner type
            </label>
            <select
              id="org-kind"
              name="partnershipKind"
              value={partnerKind}
              onChange={(e) => setPartnerKind(e.target.value)}
              className={fieldClass}
            >
              {allPartnerLabels.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
          </div>
          {partnerKind === "__custom__" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-partner-type" className={labelClass}>
                  Custom type label
                </label>
                <input
                  id="custom-partner-type"
                  name="customPartnerType"
                  required
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-partner-desc" className={labelClass}>
                  What it means
                </label>
                <input
                  id="custom-partner-desc"
                  name="customPartnerDescription"
                  className={fieldClass}
                />
              </div>
            </div>
          ) : null}
          <div>
            <p className={`${labelClass} mb-2`}>What partner types mean</p>
            <ul className="space-y-1.5 text-xs text-ink-soft">
              {definitions.map((d) => (
                <li key={d.label}>
                  <span className="font-medium text-ink">{d.label}</span> —{" "}
                  {d.description || "Custom type for this organizer."}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {!hideSubmit ? (
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          {onDone ? (
            <a href={onDone} className={buttonClass("secondary")}>
              Cancel
            </a>
          ) : null}
          <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
            {editing ? (
              "Save changes"
            ) : (
              <>
                <Plus size={14} aria-hidden="true" />
                Add
              </>
            )}
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
