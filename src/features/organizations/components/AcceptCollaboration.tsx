"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { acceptCollaboration } from "../actions/organizations.action";

/**
 * The accept button.
 *
 * A client component only so the refusal has somewhere to render: the action can
 * fail for reasons the page cannot know in advance -- the invite was sent to a
 * different address, or somebody else accepted it first.
 */
export function AcceptCollaboration({ token, organizerId }: { token: string; organizerId: string }) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(
        async (_prev: ActionResult | null, fd: FormData) => acceptCollaboration(fd),
        null,
    );

    if (state?.success) {
        return (
            <div className="flex flex-col gap-3">
                <FormFeedback success="You now have access to this event." />
                <Link href={`/organizer/${organizerId}/events`} className={buttonClass("primary")}>
                    Go to my events
                </Link>
            </div>
        );
    }

    return (
        <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="token" value={token} />
            {state?.error ? <FormFeedback error={state.error} /> : null}
            <SubmitButton pendingText="Accepting…" className={buttonClass("primary")}>
                Accept invitation
            </SubmitButton>
        </form>
    );
}
