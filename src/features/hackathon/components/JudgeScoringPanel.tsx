"use client";

import { useActionState } from "react";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { scoreSubmissionAsJudgeAction } from "../actions/judging.action";

export type JudgeScoreRow = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskMax: number;
  teamName: string;
  submittedAt: string;
  summary: string;
  myPoints: number | null;
  myComment: string;
};

export function JudgeScoringPanel({ token, rows }: { token: string; rows: JudgeScoreRow[] }) {
  const action = scoreSubmissionAsJudgeAction.bind(null, token);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  if (!rows.length) {
    return <p className="text-sm text-ink-soft">No submissions to score yet.</p>;
  }

  return (
    <div className="space-y-6">
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Score saved." /> : null}
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-line bg-paper p-4">
            <div className="mb-3">
              <p className="font-medium text-ink">
                {row.teamName} · {row.taskTitle}
              </p>
              <p className="text-xs text-ink-soft">
                Submitted {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"} · Max{" "}
                {row.taskMax} pts
              </p>
              {row.summary ? <p className="mt-2 text-sm text-ink-soft">{row.summary}</p> : null}
            </div>
            <form action={formAction} className="grid gap-3 sm:grid-cols-[8rem_1fr_auto]">
              <input type="hidden" name="submissionId" value={row.id} />
              <div>
                <label className={labelClass} htmlFor={`pts-${row.id}`}>
                  Points
                </label>
                <input
                  id={`pts-${row.id}`}
                  name="points"
                  type="number"
                  min={0}
                  max={row.taskMax}
                  step="0.01"
                  required
                  defaultValue={row.myPoints ?? ""}
                  className={`${fieldClass} mt-1 tabular-nums`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`cmt-${row.id}`}>
                  Comment (optional)
                </label>
                <input
                  id={`cmt-${row.id}`}
                  name="comment"
                  defaultValue={row.myComment}
                  className={`${fieldClass} mt-1`}
                />
              </div>
              <div className="flex items-end">
                <SubmitButton className={buttonClass("primary", "sm")}>Save</SubmitButton>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
