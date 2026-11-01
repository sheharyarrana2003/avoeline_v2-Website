"use client";

import { useActionState, useId } from "react";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { setDepartmentAccountStatus } from "../actions/departmentAccount.action";
import { QuickAction } from "./ModerationForm";

/**
 * Suspend / reactivate the department login.
 * Optional cascade: also suspend club owner users (checkbox default off).
 */
export function DepartmentAccountForm({
  orgId,
  ownerName,
  clubCount,
  suspended,
}: {
  orgId: string;
  ownerName: string;
  clubCount: number;
  suspended: boolean;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    setDepartmentAccountStatus,
    null,
  );
  const reasonId = `dept-reason-${useId()}`;
  const clubsId = `dept-clubs-${useId()}`;

  if (suspended) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">
          Sign-in is blocked. Reactivating restores department access immediately.
        </p>
        <QuickAction
          action={setDepartmentAccountStatus}
          hidden={{ orgId, suspend: "false" }}
          label="Reactivate account"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-loud bg-paper px-3 text-xs font-semibold text-ink hover:border-ink"
        />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="suspend" value="true" />

      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Suspended. Sign-in is blocked." /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className={labelClass}>
          Why are you suspending this account?
        </label>
        <textarea
          id={reasonId}
          name="reason"
          rows={2}
          maxLength={2000}
          placeholder="Abuse of the department plan, unpaid invoice, …"
          className={fieldClass}
        />
        <p className="text-xs text-ink-soft">
          Recorded in the moderation log and sent to them. Impact: sign-in blocked.
        </p>
      </div>

      {clubCount > 0 ? (
        <label htmlFor={clubsId} className="flex items-start gap-2 text-sm text-ink">
          <input
            id={clubsId}
            type="checkbox"
            name="alsoSuspendClubs"
            value="on"
            defaultChecked={false}
            className="mt-1"
          />
          <span>
            Also suspend {clubCount} club{clubCount === 1 ? "" : "s"} under this department
            <span className="mt-0.5 block text-xs text-ink-soft">
              Suspends club owner logins when they have accounts. Off by default.
            </span>
          </span>
        </label>
      ) : null}

      <div>
        <ConfirmSubmit
          tone="danger"
          title={`Suspend ${ownerName}?`}
          description="Sign-in will be blocked for this department login. Tickets already issued to attendees keep working."
          confirmLabel="Suspend account"
          className={buttonClass("destructive", "sm")}
        >
          Suspend account
        </ConfirmSubmit>
      </div>
    </form>
  );
}
