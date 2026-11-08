"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass, fieldClass, labelClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { Input } from "@/components/ui/Input";
import type { ActionResult } from "@/src/lib/action";
import { inviteJudge, removeJudge, resendJudgeInviteAction } from "../actions/judging.action";
import type { JudgeInviteStatus } from "../judging";

function statusLabel(s: JudgeInviteStatus): string {
  if (s === "accepted") return "Accepted";
  if (s === "declined") return "Declined";
  if (s === "opened") return "Opened";
  return "Invited";
}

function statusTone(s: JudgeInviteStatus): string {
  if (s === "accepted") return "confirmed";
  if (s === "declined") return "cancelled";
  if (s === "opened") return "pending";
  return "pending";
}

export function HackathonJudgeInvitePanel({
  eventId,
  trackId,
  trackName,
  judges,
  returnTo,
  senderConnected,
  senderError,
}: {
  eventId: string;
  trackId: string;
  trackName: string;
  judges: {
    id: string;
    name: string;
    email: string;
    inviteStatus: JudgeInviteStatus;
    link: string;
  }[];
  returnTo: string;
  senderConnected: boolean;
  senderError?: string | null;
}) {
  const bound = inviteJudge.bind(null, eventId);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(bound, null);

  return (
    <div className="space-y-6">
      {!senderConnected ? (
        <FormFeedback error={senderError || "Connect organizer Gmail before inviting judges."} />
      ) : null}
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Invite sent from your connected Gmail." /> : null}

      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="trackIds" value={trackId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="sm:col-span-2">
          <p className="text-xs text-ink-soft">
            Invites send through your organizer Gmail. Use {"{{name}}"}, {"{{link}}"}, and{" "}
            {"{{eventTitle}}"} in the message. Competition:{" "}
            <span className="font-medium text-ink">{trackName}</span>
          </p>
        </div>
        <Input id="judge-name" name="name" label="Name" required disabled={!senderConnected} />
        <Input
          id="judge-email"
          name="email"
          type="email"
          label="Email"
          required
          disabled={!senderConnected}
        />
        <div className="sm:col-span-2">
          <label htmlFor="judge-subject" className={labelClass}>
            Subject
          </label>
          <input
            id="judge-subject"
            name="subject"
            defaultValue="You're invited to judge — {{eventTitle}}"
            className={`${fieldClass} mt-1`}
            disabled={!senderConnected}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="judge-body" className={labelClass}>
            Message
          </label>
          <textarea
            id="judge-body"
            name="body"
            rows={6}
            defaultValue={`Hi {{name}},\n\nYou have been asked to judge {{eventTitle}}.\n\nOpen your private invite: {{link}}\n\nThat link is yours alone — please do not forward it.`}
            className={`${fieldClass} mt-1`}
            disabled={!senderConnected}
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <SubmitButton className={buttonClass()} disabled={!senderConnected}>
            Send invite
          </SubmitButton>
        </div>
      </form>

      {judges.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl">
            <thead>
              <tr>
                <th className={tableHead}>Judge</th>
                <th className={tableHead}>Status</th>
                <th className={tableHead}>Link</th>
                <th className={`${tableHead} pr-0 text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {judges.map((j) => (
                <tr key={j.id} className={tableRow}>
                  <td className={tableCell}>
                    <p className="font-medium text-ink">{j.name}</p>
                    <p className="text-xs text-ink-soft">{j.email}</p>
                  </td>
                  <td className={tableCell}>
                    <StatusBadge
                      status={statusTone(j.inviteStatus)}
                      label={statusLabel(j.inviteStatus)}
                      size="sm"
                    />
                  </td>
                  <td className={tableCell}>
                    {j.link ? (
                      <a href={j.link} className="text-sm font-medium text-ink hover:underline">
                        Open invite link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${tableCell} pr-0 text-right`}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={resendJudgeInviteAction}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="judgeId" value={j.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button
                          type="submit"
                          className={buttonClass("secondary", "sm")}
                          disabled={!senderConnected}
                        >
                          Resend
                        </button>
                      </form>
                      <form action={removeJudge.bind(null, eventId)}>
                        <input type="hidden" name="judgeId" value={j.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <ConfirmSubmit
                          tone="danger"
                          title={`Remove ${j.name}?`}
                          description="They lose access to this invite link."
                          confirmLabel="Remove"
                          className={buttonClass("ghost", "sm")}
                        >
                          Remove
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No judges invited for this competition yet.</p>
      )}
    </div>
  );
}
