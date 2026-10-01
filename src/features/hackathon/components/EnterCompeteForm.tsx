"use client";

import { useActionState } from "react";
import { enterCompeteAction } from "../actions/enterCompete.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { fieldClass, labelClass } from "@/src/lib/ui";

export function EnterCompeteForm({ eventId }: { eventId: string }) {
    const action = enterCompeteAction.bind(null, eventId);
    const [state, formAction] = useActionState(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {state?.error ? <FormFeedback error={state.error} /> : null}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="access-code" className={labelClass}>
                    Access code
                </label>
                <input
                    id="access-code"
                    name="code"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    className={`${fieldClass} font-mono uppercase tracking-wide`}
                    placeholder="AV-XXXXXXXX"
                />
            </div>
            <SubmitButton>Open dashboard</SubmitButton>
        </form>
    );
}
