"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";

/**
 * The admin login (spec 9.1).
 *
 * Deliberately not the shared sign-in form. That one redirects whoever signs in
 * to their own dashboard, which for an admin account means guessing; and it
 * offers a sign-up link, which must never appear here because admin is not a
 * role anybody can register as. This form does one thing and says so.
 */
export function AdminSignInForm({
    action,
}: {
    action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-ink-soft">
                <ShieldCheck size={14} aria-hidden="true" />
                Platform administration
            </div>

            {state?.error ? <FormFeedback error={state.error} /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-email" className={labelClass}>Email</label>
                <input
                    id="admin-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-password" className={labelClass}>Password</label>
                <input
                    id="admin-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className={fieldClass}
                />
            </div>

            <SubmitButton pendingText="Signing in…" className={buttonClass("primary", "lg", "w-full")}>
                Sign in
            </SubmitButton>

            <p className="text-xs text-ink-soft">
                Admin accounts are created by a platform owner. There is no sign-up here.
            </p>
        </form>
    );
}
