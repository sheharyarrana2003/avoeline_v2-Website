"use client";

import { useActionState, useState } from "react";
import { Globe, Lock, Mail, Crown, Layers } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { saveAccessSettings } from "../actions/accessSettings.action";
import { ACCESS_TYPES, ACCESS_TYPE_META, type EventAccess, type EventAccessType } from "../types";

const TYPE_ICONS: Record<
  EventAccessType,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  public: Globe,
  private: Lock,
  invite_only: Mail,
  hybrid: Layers,
  tiered: Crown,
};

/**
 * Access type cards + type-scoped settings + approval/waitlist + one Save (docs/22 O3).
 */
export function AccessSettingsForm({
  eventId,
  visibility,
  accessCode,
  access,
}: {
  eventId: string;
  visibility: EventAccessType;
  accessCode: string | null;
  access: EventAccess;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveAccessSettings,
    null,
  );
  const [type, setType] = useState<EventAccessType>(
    visibility === ("vip_tiered" as EventAccessType) ? "tiered" : visibility,
  );

  const showCode = type === "private" || type === "hybrid";
  const showGated = type === "hybrid";
  const showTiers = type === "tiered" || type === "hybrid";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="eventId" value={eventId} />
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Access settings saved." /> : null}

      <fieldset>
        <legend className={labelClass}>Access type</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACCESS_TYPES.map((value) => {
            const Icon = TYPE_ICONS[value];
            const selected = type === value;
            return (
              <label
                key={value}
                className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                  selected
                    ? "border-ink bg-muted ring-1 ring-ink/10"
                    : "border-line hover:border-line-loud"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-ink">
                    <Icon size={16} aria-hidden />
                  </span>
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={selected}
                    onChange={() => setType(value)}
                    className="h-4 w-4 accent-current"
                  />
                </div>
                <span className="text-sm font-medium text-ink">
                  {ACCESS_TYPE_META[value].label}
                </span>
                <span className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {ACCESS_TYPE_META[value].description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {showCode ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accessCode" className={labelClass}>
            Access code
          </label>
          <input
            id="accessCode"
            name="accessCode"
            defaultValue={accessCode ?? ""}
            maxLength={64}
            autoComplete="off"
            placeholder="Leave blank for no code"
            className={fieldClass}
          />
          <p className="text-xs text-ink-soft">
            {type === "private"
              ? "Anyone with the link must enter this to see the event (unless whitelisted)."
              : "Needed only for the gated tiers below."}
          </p>
        </div>
      ) : null}

      {showTiers ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attendeeTiers" className={labelClass}>
            Attendee tiers
          </label>
          <textarea
            id="attendeeTiers"
            name="attendeeTiers"
            rows={5}
            defaultValue={access.attendeeTiers.join("\n")}
            className={`${fieldClass} resize-none`}
          />
          <p className="text-xs text-ink-soft">
            One per line. The first is the default for anyone not assigned a tier.
          </p>
        </div>
      ) : null}

      {showGated ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gatedTiers" className={labelClass}>
            Gated tiers
          </label>
          <textarea
            id="gatedTiers"
            name="gatedTiers"
            rows={3}
            defaultValue={access.gatedTiers.join("\n")}
            className={`${fieldClass} resize-none`}
          />
          <p className="text-xs text-ink-soft">
            One per line; each must also appear above. These need the access code or the guest list.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        {showTiers ? (
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="allowTierSelfSelect"
              defaultChecked={access.allowTierSelfSelect}
              className="mt-0.5 h-4 w-4 accent-current"
            />
            <span>Let attendees choose their own tier when registering</span>
          </label>
        ) : null}
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="requiresApproval"
            defaultChecked={access.requiresApproval}
            className="mt-0.5 h-4 w-4 accent-current"
          />
          <span>Hold new registrations until I approve them</span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="waitlistEnabled"
            defaultChecked={access.waitlistEnabled}
            className="mt-0.5 h-4 w-4 accent-current"
          />
          <span>
            Once full, put new registrants on a waitlist and promote them as places free up
          </span>
        </label>
      </div>

      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
          Save access settings
        </SubmitButton>
      </div>
    </form>
  );
}
