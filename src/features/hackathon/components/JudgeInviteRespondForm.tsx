"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { recordJudgeInviteResponse } from "../actions/judging.action";

export function JudgeInviteRespondForm({ token }: { token: string }) {
  const action = recordJudgeInviteResponse.bind(null, token);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Thanks — your response was saved." /> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="accept"
          className={buttonClass("primary", "sm")}
          disabled={state?.success === true}
        >
          I accept
        </button>
        <button
          type="submit"
          name="decision"
          value="decline"
          className={buttonClass("secondary", "sm")}
          disabled={state?.success === true}
        >
          Decline
        </button>
      </div>
      <p className="text-xs text-ink-soft">No login required — this link is your confirmation.</p>
    </form>
  );
}
