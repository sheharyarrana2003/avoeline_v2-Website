"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { registerAttendeeAction } from "../actions/registerAttendee.action";
import { previewPromo } from "../actions/previewPromo.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ActionResult } from "@/src/lib/action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import { CustomFieldsRenderer } from "@/src/features/events/components/CustomFieldsRenderer";
import type { EventFormField } from "@/src/features/registration/forms/formFields.types";
import { HACKATHON_KIND_LABELS, type HackathonKind } from "@/src/features/hackathon/kinds";
import {
  ConsentCheckboxes,
  defaultConsentState,
} from "@/src/features/website/components/ConsentCheckboxes";

export type CompetitionChoice = {
  id: string;
  name: string;
  kind: HackathonKind;
  description: string;
  instructions: string;
  policies: string;
  rulesText: string;
  fee: number;
  due: number;
  currency: string;
  discountPercent: number;
  discountNote: string;
  minTeamSize: number;
  maxTeamSize: number;
  submissionDeadline: string;
  prizePool: string;
  imageUrl: string;
};

export interface RegistrationFormProps {
  eventId: string;
  isPaid: boolean;
  priceLabel: string;
  inviteToken?: string | null;
  accessCode?: string | null;
  joinsWaitlist?: boolean;
  needsApproval?: boolean;
  tierChoices?: string[];
  /** Active field definitions from event_form_fields. */
  formFields?: EventFormField[];
  attendee?: { name?: string; email?: string } | null;
  competitions?: CompetitionChoice[];
  groupRegistration?: boolean;
  groupMinSize?: number;
  groupMaxSize?: number;
  /** Admin preview: show fields but disable submit and uploads. */
  previewOnly?: boolean;
  /** Paid events: shown before the payment screenshot field. */
  paymentInstructions?: string | null;
}

export function RegistrationForm({
  eventId,
  isPaid,
  priceLabel,
  inviteToken = null,
  accessCode = null,
  tierChoices = [],
  joinsWaitlist = false,
  needsApproval = false,
  formFields = [],
  attendee = null,
  competitions = [],
  groupRegistration = false,
  groupMinSize = 2,
  groupMaxSize = 8,
  previewOnly = false,
  paymentInstructions = null,
}: RegistrationFormProps) {
  const boundAction = registerAttendeeAction.bind(null, eventId);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(boundAction, null);
  const [trackId, setTrackId] = useState(competitions[0]?.id ?? "");
  const [registerAsTeam, setRegisterAsTeam] = useState(false);
  const [memberSlots, setMemberSlots] = useState<number[]>([]);
  const [promoPreview, setPromoPreview] = useState<{
    original: number;
    discount: number;
    total: number;
    code: string;
    currency: string;
  } | null>(null);
  const [promoPending, startPromo] = useTransition();
  const [consent, setConsent] = useState(defaultConsentState);

  const selected = useMemo(
    () => competitions.find((c) => c.id === trackId) ?? competitions[0],
    [competitions, trackId],
  );
  const due = selected ? selected.due : isPaid ? 1 : 0;
  const paidNow = competitions.length ? due > 0 : isPaid;
  const groupMode = groupRegistration && registerAsTeam && !competitions.length;
  const maxMembers = groupMode
    ? Math.max(0, groupMaxSize - 1)
    : Math.max(0, (selected?.maxTeamSize ?? 1) - 1);
  const minExtra = groupMode ? Math.max(0, groupMinSize - 1) : 0;

  const leadFields = formFields.filter((f) => {
    if (f.archivedAt) return false;
    if (groupMode || competitions.length) {
      // Lead fills per_group once + their own per_member (incl system).
      return true;
    }
    return true;
  });
  const groupOnlyFields = leadFields.filter((f) => f.scope === "per_group");
  const memberFields = leadFields.filter((f) => f.scope === "per_member");
  // Solo: all fields once. Group/hackathon lead: per_member for lead + per_group once.
  const soloOrLeadMemberFields = memberFields;
  const paymentField = soloOrLeadMemberFields.find((f) => f.key === "payment_screenshot");
  const fieldsBeforePayment = soloOrLeadMemberFields.filter((f) => f.key !== "payment_screenshot");
  const showPaymentInstructions =
    paidNow && !!String(paymentInstructions || "").trim() && !!paymentField;
  const amountLabel = selected
    ? selected.due > 0
      ? formatCurrency(selected.due, selected.currency, "Free")
      : "Free"
    : priceLabel;

  return (
    <form
      action={previewOnly ? undefined : formAction}
      onSubmit={previewOnly ? (e) => e.preventDefault() : undefined}
      className="flex flex-col gap-5"
      encType="multipart/form-data"
      aria-disabled={previewOnly || undefined}
    >
      {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}
      {accessCode ? <input type="hidden" name="accessCode" value={accessCode} /> : null}

      {/* Honeypot — hidden from people, visible to bots */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="reg-website">Website</label>
        <input id="reg-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state?.error && <FormFeedback error={state.error} />}

      {groupRegistration && !competitions.length ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper px-3 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={registerAsTeam}
            onChange={(e) => {
              const on = e.target.checked;
              setRegisterAsTeam(on);
              if (!on) setMemberSlots([]);
            }}
          />
          <span>
            <span className="block text-sm font-medium text-ink">Register as a team</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              Groups of {groupMinSize}–{groupMaxSize}. Each person still gets their own ticket.
            </span>
          </span>
        </label>
      ) : null}

      {competitions.length || groupMode ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="team-name" className={labelClass}>
            {groupMode ? "Group name" : "Team name"}
          </label>
          <input
            id="team-name"
            name="teamName"
            type="text"
            required
            maxLength={80}
            placeholder={groupMode ? "Table 4" : "Night Shift"}
            className={fieldClass}
          />
          <input type="hidden" name="memberCount" value={memberSlots.length} />
          {groupMode ? <input type="hidden" name="groupRegister" value="1" /> : null}
          <p className="text-xs text-ink-soft">
            {groupMode
              ? `Add your group members below (${groupMinSize}–${groupMaxSize} including you).`
              : `You are registering as team lead. Teams of ${selected?.minTeamSize ?? 1}–${selected?.maxTeamSize ?? 1} for this competition.`}
          </p>
        </div>
      ) : null}

      {competitions.length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className={labelClass}>Competition</legend>
          <div className="flex flex-col gap-2">
            {competitions.map((c) => {
              const active = c.id === selected?.id;
              return (
                <label
                  key={c.id}
                  className={`cursor-pointer rounded-xl border px-3 py-3 ${
                    active ? "border-ink bg-muted" : "border-line bg-paper"
                  }`}
                >
                  <input
                    type="radio"
                    name="trackId"
                    value={c.id}
                    checked={active}
                    onChange={() => setTrackId(c.id)}
                    className="sr-only"
                    required
                  />
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{c.name}</span>
                    <span className="text-xs tabular-nums text-ink-soft">
                      {c.due > 0 ? formatCurrency(c.due, c.currency, "Free") : "Free"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-2xs uppercase text-ink-faint">
                    {HACKATHON_KIND_LABELS[c.kind]} · teams of {c.minTeamSize}–{c.maxTeamSize}
                  </span>
                </label>
              );
            })}
          </div>
          {selected?.description ? (
            <p className="whitespace-pre-line rounded-xl border border-line bg-paper p-4 text-sm text-ink">
              {selected.description}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {attendee?.name || attendee?.email ? (
        <>
          {attendee.name ? <input type="hidden" name="prefName" value={attendee.name} /> : null}
          {attendee.email ? <input type="hidden" name="prefEmail" value={attendee.email} /> : null}
        </>
      ) : null}

      {fieldsBeforePayment.length || paymentField ? (
        <div className="flex flex-col gap-5">
          <p className={labelClass}>
            {competitions.length || groupMode
              ? groupMode
                ? "Group lead"
                : "Team lead"
              : "Your details"}
          </p>
          {fieldsBeforePayment.length ? (
            <CustomFieldsRenderer
              fields={fieldsBeforePayment}
              eventId={eventId}
              useKeyAsName
              previewOnly={previewOnly}
            />
          ) : null}
          {showPaymentInstructions ? (
            <div className="rounded-xl border border-line bg-muted/50 px-4 py-3 text-sm text-ink">
              <p className="text-2xs font-medium uppercase tracking-wide text-ink-soft">
                Payment instructions
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {String(paymentInstructions).trim()}
              </p>
            </div>
          ) : null}
          {paymentField ? (
            <CustomFieldsRenderer
              fields={[paymentField]}
              eventId={eventId}
              useKeyAsName
              previewOnly={previewOnly}
            />
          ) : null}
        </div>
      ) : null}

      {groupOnlyFields.length && (groupMode || competitions.length) ? (
        <div className="flex flex-col gap-5 border-t border-line pt-5">
          <p className={labelClass}>Questions for the {groupMode ? "group" : "team"}</p>
          <CustomFieldsRenderer
            fields={groupOnlyFields}
            eventId={eventId}
            useKeyAsName
            previewOnly={previewOnly}
          />
        </div>
      ) : groupOnlyFields.length && !groupMode && !competitions.length ? (
        <CustomFieldsRenderer
          fields={groupOnlyFields}
          eventId={eventId}
          useKeyAsName
          previewOnly={previewOnly}
        />
      ) : null}

      {tierChoices.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-tier" className={labelClass}>
            Ticket type
          </label>
          <select id="reg-tier" name="tier" defaultValue={tierChoices[0]} className={fieldClass}>
            {tierChoices.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {(competitions.length || groupMode) && maxMembers > 0 ? (
        <div className="flex flex-col gap-5 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={labelClass}>{groupMode ? "Group members" : "Team members"}</p>
            {memberSlots.length < maxMembers ? (
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => setMemberSlots((slots) => [...slots, Date.now()])}
              >
                Add {groupMode ? "member" : "team member"}
              </button>
            ) : null}
          </div>
          <p className="text-xs text-ink-soft">
            {groupMode
              ? `Add at least ${minExtra} extra ${minExtra === 1 ? "person" : "people"} (group size ${groupMinSize}–${groupMaxSize}).`
              : `You can add up to ${maxMembers} besides yourself.`}
          </p>
          {memberSlots.map((slot, index) => (
            <div key={slot} className="space-y-4 rounded-xl border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Member {index + 2}</p>
                <button
                  type="button"
                  className="text-2xs uppercase text-ink-faint hover:text-ink"
                  onClick={() => setMemberSlots((slots) => slots.filter((s) => s !== slot))}
                >
                  Remove
                </button>
              </div>
              <input type="hidden" name={`member_${index}_slot`} value="1" />
              <CustomFieldsRenderer
                fields={memberFields}
                eventId={eventId}
                namePrefix={`member_${index}_`}
                useKeyAsName={false}
                previewOnly={previewOnly}
              />
            </div>
          ))}
        </div>
      ) : null}

      {paidNow ? (
        <div className="flex flex-col gap-1.5 border-t border-line pt-5">
          <label htmlFor="reg-promo" className={labelClass}>
            Promo code <span className="normal-case text-ink-faint">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input id="reg-promo" name="promoCode" className={fieldClass} autoComplete="off" />
            <button
              type="button"
              disabled={promoPending}
              className={buttonClass("secondary", "sm")}
              onClick={() => {
                const input = document.getElementById("reg-promo") as HTMLInputElement | null;
                const code = input?.value?.trim() || "";
                if (!code) {
                  setPromoPreview(null);
                  return;
                }
                startPromo(async () => {
                  const res = await previewPromo({
                    eventId,
                    code,
                    trackId: trackId || null,
                  });
                  if (res.ok) setPromoPreview(res.data);
                  else setPromoPreview(null);
                });
              }}
            >
              Apply
            </button>
          </div>
          {promoPreview ? (
            <p className="text-xs text-ink-soft">
              {formatCurrency(promoPreview.original, promoPreview.currency)} −{" "}
              {formatCurrency(promoPreview.discount, promoPreview.currency)} ={" "}
              <span className="font-medium text-ink">
                {formatCurrency(promoPreview.total, promoPreview.currency, "Free")}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <ConsentCheckboxes
        idPrefix="reg"
        legalAccepted={consent.legalAccepted}
        communityOptIn={consent.communityOptIn}
        onLegalChange={(legalAccepted) => setConsent((c) => ({ ...c, legalAccepted }))}
        onCommunityChange={(communityOptIn) => setConsent((c) => ({ ...c, communityOptIn }))}
      />
      <input type="hidden" name="legalAccepted" value={consent.legalAccepted ? "1" : "0"} />
      <input type="hidden" name="communityOptIn" value={consent.communityOptIn ? "1" : "0"} />

      <SubmitButton
        pendingText="Registering…"
        className={buttonClass("primary", "lg", "w-full")}
        disabled={previewOnly || !consent.legalAccepted}
      >
        {previewOnly
          ? "Preview only"
          : joinsWaitlist
            ? "Join the waitlist"
            : paidNow
              ? `Register — ${promoPreview ? formatCurrency(promoPreview.total, promoPreview.currency, "Free") : amountLabel}`
              : "Register for free"}
      </SubmitButton>

      <p className="text-xs text-ink-soft">
        {joinsWaitlist
          ? "This event is full. You will join the waitlist and be emailed if a place frees up."
          : paidNow
            ? "Your place is held once the organiser confirms your payment."
            : needsApproval
              ? "The organiser reviews registrations for this event, and will email you once they decide."
              : "Your place is confirmed as soon as you register."}
      </p>
    </form>
  );
}

export default RegistrationForm;
