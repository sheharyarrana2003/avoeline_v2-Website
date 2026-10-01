"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { ADMIN_AREAS, ADMIN_AREA_META } from "../types";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/** The area checkboxes, shared by the create and edit forms. */
function AreaPicker({ selected, idPrefix }: { selected: string[]; idPrefix: string }) {
    const held = new Set(selected);
    return (
        <div className="flex flex-col gap-2">
            {ADMIN_AREAS.map((area) => {
                const id = `${idPrefix}-${area}`;
                return (
                    <label key={area} htmlFor={id} className="flex items-start gap-2.5 text-sm text-ink">
                        <input
                            id={id}
                            type="checkbox"
                            name="permissions"
                            value={area}
                            defaultChecked={held.has(area)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                        />
                        <span>
                            {ADMIN_AREA_META[area].label}
                            <span className="block text-xs text-ink-soft">{ADMIN_AREA_META[area].description}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

/**
 * Spec 9.1: an owner creates another admin.
 *
 * The password is set here rather than emailed as an invite, because this app
 * has no password-reset flow to fall back on — an invite link would be a second
 * credential mechanism to build and secure for one screen.
 */
export function CreateAdminForm({ action }: { action: Action }) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-5">
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Added. They can sign in at /admin/signin." /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="admin-new-name" className={labelClass}>Name</label>
                    <input id="admin-new-name" name="name" required maxLength={120} className={fieldClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="admin-new-email" className={labelClass}>Email</label>
                    <input id="admin-new-email" name="email" type="email" required className={fieldClass} />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="admin-new-password" className={labelClass}>Password</label>
                <input
                    id="admin-new-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={fieldClass}
                />
                <p className="text-xs text-ink-soft">
                    At least eight characters. Give it to them directly — nothing is emailed.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <span className={labelClass}>What they can work on</span>
                <p className="text-xs text-ink-soft">
                    Tick every area they should see. Platform staff (adding other admins) stays owner-only.
                </p>
                <AreaPicker selected={[...ADMIN_AREAS]} idPrefix="new" />
            </div>

            <div>
                <SubmitButton pendingText="Adding…" className={buttonClass("primary")}>
                    Add admin
                </SubmitButton>
            </div>
        </form>
    );
}

/** Change what one admin holds, or revoke them entirely. */
export function AdminRow({
    admin,
    savePermissions,
    revoke,
}: {
    admin: { userId: string; email: string; name: string; isOwner: boolean; permissions: string[]; accountStatus: string };
    savePermissions: Action;
    revoke: Action;
}) {
    const [saveState, saveAction] = useActionState<ActionResult | null, FormData>(savePermissions, null);
    const [revokeState, revokeAction] = useActionState<ActionResult | null, FormData>(revoke, null);

    if (admin.isOwner) {
        return (
            <div className="py-4">
                <p className="text-sm text-ink">
                    {admin.name || admin.email}
                    <span className="ml-2 text-2xs uppercase text-ink-faint">owner · holds everything</span>
                </p>
                <p className="text-xs text-ink-soft">
                    {admin.email} — an owner&apos;s access does not come from a list, so there is nothing to edit.
                </p>
            </div>
        );
    }

    return (
        <div className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-ink">
                    {admin.name || admin.email}
                    <span className="ml-2 text-xs text-ink-soft">{admin.email}</span>
                </p>
                <span className="text-2xs uppercase text-ink-faint">
                    {admin.accountStatus === "active" ? `${admin.permissions.length} area(s)` : admin.accountStatus}
                </span>
            </div>

            {saveState?.error ? <FormFeedback error={saveState.error} className="mt-2" /> : null}
            {saveState?.success ? <FormFeedback success="Saved. It applies on their next request." className="mt-2" /> : null}
            {revokeState?.error ? <FormFeedback error={revokeState.error} className="mt-2" /> : null}

            {admin.accountStatus === "active" ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <form action={saveAction} className="flex flex-col gap-3">
                        <input type="hidden" name="userId" value={admin.userId} />
                        <AreaPicker selected={admin.permissions} idPrefix={admin.userId} />
                        <div>
                            <SubmitButton pendingText="Saving…" className={buttonClass("secondary", "sm")}>
                                Save permissions
                            </SubmitButton>
                        </div>
                    </form>

                    <form action={revokeAction}>
                        <input type="hidden" name="userId" value={admin.userId} />
                        <ConfirmSubmit
                            tone="danger"
                            title={`Revoke ${admin.name || admin.email}?`}
                            description="Their account is disabled and their areas cleared, so they cannot sign in. It is not deleted — the moderation log points at them by id, and a log whose author cannot be resolved is worth less."
                            confirmLabel="Revoke access"
                            className={buttonClass("destructive", "sm")}
                        >
                            Revoke
                        </ConfirmSubmit>
                    </form>
                </div>
            ) : (
                <p className="mt-2 text-xs text-ink-soft">
                    This account has been revoked. Its history stays in the moderation log.
                </p>
            )}
        </div>
    );
}
