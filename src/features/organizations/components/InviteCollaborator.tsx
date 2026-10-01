"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { inviteCollaborator } from "../actions/organizations.action";

/**
 * Send a collaborator their invitation.
 *
 * Inline on the row rather than a separate screen, because the thing being
 * invited already exists at this point -- the invite is one field about a record
 * that is already there.
 */
export function InviteCollaborator({
    eventId,
    id,
    defaultEmail,
}: {
    eventId: string;
    id: string;
    defaultEmail: string;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(inviteCollaborator, null);

    return (
        <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="id" value={id} />
            <div className="flex flex-wrap items-center gap-2">
                <input
                    name="email"
                    type="email"
                    required
                    defaultValue={defaultEmail}
                    placeholder="their@email.com"
                    aria-label="Collaborator email"
                    className={`${fieldClass} max-w-56`}
                />
                <SubmitButton pendingText="Sending…" className={buttonClass("secondary", "sm")}>
                    <Mail size={13} aria-hidden="true" />
                    Invite
                </SubmitButton>
            </div>
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Invitation sent." /> : null}
        </form>
    );
}
