"use client";

import { useActionState, useEffect, useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import {
  ADMIN_AREAS,
  ADMIN_AREA_META,
  TENANT_CAPS,
  TENANT_CAP_META,
  WEBSITE_CAPS,
  WEBSITE_CAP_META,
  normalizeAdminGrants,
  type AdminArea,
  type AdminRecordRow,
} from "../types";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/** Per-tab View / Manage toggles. Manage implies view when saving. */
function AreaPicker({ selected, idPrefix }: { selected: string[]; idPrefix: string }) {
  const grants = new Set(normalizeAdminGrants(selected));
  const rawCaps = new Set(selected.map(String));
  return (
    <div className="flex flex-col gap-3">
      {ADMIN_AREAS.map((area) => {
        const viewId = `${idPrefix}-${area}-view`;
        const manageId = `${idPrefix}-${area}-manage`;
        const hasView = grants.has(`${area}:view`) || grants.has(`${area}:manage`);
        const hasManage = grants.has(`${area}:manage`);
        return (
          <div key={area} className="rounded-lg border border-line px-3 py-2">
            <p className="text-sm font-medium text-ink">{ADMIN_AREA_META[area].label}</p>
            <p className="text-xs text-ink-soft">{ADMIN_AREA_META[area].description}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink">
              <label htmlFor={viewId} className="inline-flex items-center gap-2">
                <input
                  id={viewId}
                  type="checkbox"
                  name="permissions"
                  value={`${area}:view`}
                  defaultChecked={hasView}
                  className="h-4 w-4 accent-current"
                />
                View
              </label>
              <label htmlFor={manageId} className="inline-flex items-center gap-2">
                <input
                  id={manageId}
                  type="checkbox"
                  name="permissions"
                  value={`${area}:manage`}
                  defaultChecked={hasManage}
                  className="h-4 w-4 accent-current"
                />
                Manage
              </label>
            </div>
            {area === "tenants" ? (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <p className="text-2xs font-medium uppercase text-ink-soft">Tenant write caps</p>
                <p className="text-xs text-ink-soft">
                  Manage implies all. Otherwise tick only the writes this staffer may do.
                </p>
                <div className="flex flex-col gap-2 text-sm text-ink">
                  {TENANT_CAPS.map((cap) => {
                    const capId = `${idPrefix}-${cap.replace(":", "-")}`;
                    return (
                      <label key={cap} htmlFor={capId} className="inline-flex items-start gap-2">
                        <input
                          id={capId}
                          type="checkbox"
                          name="permissions"
                          value={cap}
                          defaultChecked={hasManage || rawCaps.has(cap)}
                          className="mt-0.5 h-4 w-4 accent-current"
                        />
                        <span>
                          <span className="font-medium">{TENANT_CAP_META[cap].label}</span>
                          <span className="block text-xs text-ink-soft">
                            {TENANT_CAP_META[cap].description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {area === "website" ? (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <p className="text-2xs font-medium uppercase text-ink-soft">Website caps</p>
                <p className="text-xs text-ink-soft">
                  Manage implies view and edit. Publish, legal, contact, and community need their
                  own ticks.
                </p>
                <div className="flex flex-col gap-2 text-sm text-ink">
                  {WEBSITE_CAPS.map((cap) => {
                    const capId = `${idPrefix}-${cap.replace(":", "-")}`;
                    const manageImplies =
                      hasManage && (cap === "website:view" || cap === "website:edit");
                    return (
                      <label key={cap} htmlFor={capId} className="inline-flex items-start gap-2">
                        <input
                          id={capId}
                          type="checkbox"
                          name="permissions"
                          value={cap}
                          defaultChecked={manageImplies || rawCaps.has(cap) || grants.has(cap)}
                          className="mt-0.5 h-4 w-4 accent-current"
                        />
                        <span>
                          <span className="font-medium">{WEBSITE_CAP_META[cap].label}</span>
                          <span className="block text-xs text-ink-soft">
                            {WEBSITE_CAP_META[cap].description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function initials(name: string, email: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function grantChips(
  permissions: string[],
  isOwner: boolean,
): { area: AdminArea; label: string; cap: string }[] {
  if (isOwner) {
    return ADMIN_AREAS.map((area) => ({
      area,
      label: ADMIN_AREA_META[area].label,
      cap: "full",
    }));
  }
  const grants = normalizeAdminGrants(permissions);
  return ADMIN_AREAS.flatMap((area) => {
    const manage = grants.includes(`${area}:manage`);
    const view = manage || grants.includes(`${area}:view`);
    if (!view) return [];
    return [{ area, label: ADMIN_AREA_META[area].label, cap: manage ? "manage" : "view" }];
  });
}

function StaffAvatar({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, not a known host
      <img
        src={avatarUrl}
        alt=""
        className="h-12 w-12 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <span
      className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-muted text-sm font-semibold text-ink"
      aria-hidden="true"
    >
      {initials(name, email)}
    </span>
  );
}

function CreateAdminWizard({
  action,
  open,
  onClose,
}: {
  action: Action;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add staff"
      description={step === 1 ? "Personal details" : "What they can work on"}
      maxWidth="lg"
    >
      <form
        action={formAction}
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          if (step !== 2) e.preventDefault();
        }}
      >
        {state?.error ? <FormFeedback error={state.error} /> : null}

        <div className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-new-name" className={labelClass}>
                Name
              </label>
              <input
                id="admin-new-name"
                name="name"
                required
                maxLength={120}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-new-email" className={labelClass}>
                Email
              </label>
              <input
                id="admin-new-email"
                name="email"
                type="email"
                required
                className={fieldClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-new-password" className={labelClass}>
              Password
            </label>
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-new-avatar" className={labelClass}>
              Image URL <span className="normal-case text-ink-faint">(optional)</span>
            </label>
            <input
              id="admin-new-avatar"
              name="avatarUrl"
              type="url"
              placeholder="https://"
              className={fieldClass}
            />
          </div>
        </div>

        <div className={step === 2 ? "flex flex-col gap-3" : "hidden"}>
          <p className="text-xs text-ink-soft">
            View opens the same screens the owner sees. Manage adds status actions. Platform staff
            stays owner-only.
          </p>
          <AreaPicker
            selected={ADMIN_AREAS.flatMap((a) => [`${a}:view`, `${a}:manage`])}
            idPrefix="new"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose} className={buttonClass("ghost", "sm")}>
                Cancel
              </button>
              <button
                type="button"
                className={buttonClass("primary", "sm")}
                onClick={(e) => {
                  const form = e.currentTarget.form;
                  if (!form) return;
                  if (!form.reportValidity()) return;
                  setStep(2);
                }}
              >
                Next: access
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={buttonClass("secondary", "sm")}
              >
                Back
              </button>
              <SubmitButton pendingText="Adding…" className={buttonClass("primary", "sm")}>
                Add staff
              </SubmitButton>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

function StaffPreview({
  admin,
  open,
  onClose,
  savePermissions,
  revoke,
}: {
  admin: AdminRecordRow | null;
  open: boolean;
  onClose: () => void;
  savePermissions: Action;
  revoke: Action;
}) {
  const [saveState, saveAction] = useActionState<ActionResult | null, FormData>(
    savePermissions,
    null,
  );
  const [revokeState, revokeAction] = useActionState<ActionResult | null, FormData>(revoke, null);

  useEffect(() => {
    if (revokeState?.success) onClose();
  }, [revokeState?.success, onClose]);

  if (!admin) return null;

  const chips = grantChips(admin.permissions, admin.isOwner);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={admin.name || admin.email}
      description={admin.isOwner ? "Owner · holds everything" : admin.email}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <StaffAvatar name={admin.name} email={admin.email} avatarUrl={admin.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{admin.name || "—"}</p>
            <p className="truncate text-sm text-ink-soft">{admin.email}</p>
            <p className="mt-1 text-2xs uppercase text-ink-faint">
              {admin.accountStatus === "active" ? "Active" : admin.accountStatus}
            </p>
          </div>
        </div>

        {admin.isOwner ? (
          <p className="text-sm text-ink-soft">
            An owner&apos;s access does not come from a list, so there is nothing to edit.
          </p>
        ) : (
          <>
            <div>
              <p className={labelClass}>Access</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.length === 0 ? (
                  <span className="text-sm text-ink-soft">No areas granted</span>
                ) : (
                  chips.map((c) => (
                    <span
                      key={c.area}
                      className="rounded-md border border-line bg-muted px-2 py-0.5 text-2xs text-ink"
                    >
                      {c.label} · {c.cap}
                    </span>
                  ))
                )}
              </div>
            </div>

            {saveState?.error ? <FormFeedback error={saveState.error} /> : null}
            {saveState?.success ? (
              <FormFeedback success="Saved. It applies on their next request." />
            ) : null}
            {revokeState?.error ? <FormFeedback error={revokeState.error} /> : null}

            {admin.accountStatus === "active" ? (
              <>
                <form action={saveAction} className="flex flex-col gap-3">
                  <input type="hidden" name="userId" value={admin.userId} />
                  <AreaPicker selected={admin.permissions} idPrefix={`preview-${admin.userId}`} />
                  <div>
                    <SubmitButton pendingText="Saving…" className={buttonClass("secondary", "sm")}>
                      Save permissions
                    </SubmitButton>
                  </div>
                </form>

                <form action={revokeAction} className="border-t border-line pt-4">
                  <input type="hidden" name="userId" value={admin.userId} />
                  <ConfirmSubmit
                    tone="danger"
                    title={`Revoke ${admin.name || admin.email}?`}
                    description="Their account is disabled and their areas cleared, so they cannot sign in. It is not deleted — the moderation log points at them by id."
                    confirmLabel="Revoke access"
                    className={buttonClass("destructive", "sm")}
                  >
                    Revoke access
                  </ConfirmSubmit>
                </form>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                This account has been revoked. Its history stays in the moderation log.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export function PlatformStaffBoard({
  admins,
  createAdmin,
  savePermissions,
  revoke,
}: {
  admins: AdminRecordRow[];
  createAdmin: Action;
  savePermissions: Action;
  revoke: Action;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<AdminRecordRow | null>(null);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        {admins.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No stored admin accounts yet"
            description="You may be here through PLATFORM_ADMIN_EMAILS — add staff here, or promote this account from the dashboard."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {admins.map((row) => {
              const chips = grantChips(row.permissions, row.isOwner).slice(0, 4);
              const extra = grantChips(row.permissions, row.isOwner).length - chips.length;
              return (
                <li key={row.userId}>
                  <button
                    type="button"
                    onClick={() => setPreview(row)}
                    className="h-full w-full text-left"
                  >
                    <Card tone="flat" interactive className="h-full">
                      <CardBody className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <StaffAvatar
                            name={row.name}
                            email={row.email}
                            avatarUrl={row.avatarUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">
                              {row.name || row.email}
                              {row.isOwner ? (
                                <span className="ml-2 text-2xs uppercase text-ink-faint">
                                  owner
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-sm text-ink-soft">{row.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {chips.map((c) => (
                            <span
                              key={c.area}
                              className="rounded-md border border-line bg-muted px-2 py-0.5 text-2xs text-ink"
                            >
                              {c.label}
                              {!row.isOwner ? ` · ${c.cap}` : ""}
                            </span>
                          ))}
                          {extra > 0 ? (
                            <span className="rounded-md border border-line px-2 py-0.5 text-2xs text-ink-soft">
                              +{extra} more
                            </span>
                          ) : null}
                        </div>
                      </CardBody>
                    </Card>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="shrink-0 lg:sticky lg:top-6 lg:w-52">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={`${buttonClass("primary")} w-full gap-2`}
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add staff
        </button>
      </aside>

      {addOpen ? (
        <CreateAdminWizard action={createAdmin} open onClose={() => setAddOpen(false)} />
      ) : null}
      {preview ? (
        <StaffPreview
          key={preview.userId}
          admin={preview}
          open
          onClose={() => setPreview(null)}
          savePermissions={savePermissions}
          revoke={revoke}
        />
      ) : null}
    </div>
  );
}

/** @deprecated Prefer PlatformStaffBoard — kept for any stray imports. */
export function CreateAdminForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Added. They can sign in at /admin/signin." /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-new-name" className={labelClass}>
            Name
          </label>
          <input id="admin-new-name" name="name" required maxLength={120} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-new-email" className={labelClass}>
            Email
          </label>
          <input id="admin-new-email" name="email" type="email" required className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="admin-new-password" className={labelClass}>
          Password
        </label>
        <input
          id="admin-new-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>What they can work on</span>
        <AreaPicker
          selected={ADMIN_AREAS.flatMap((a) => [`${a}:view`, `${a}:manage`])}
          idPrefix="legacy-new"
        />
      </div>

      <div>
        <SubmitButton pendingText="Adding…" className={buttonClass("primary")}>
          Add admin
        </SubmitButton>
      </div>
    </form>
  );
}

/** @deprecated Prefer PlatformStaffBoard preview. */
export function AdminRow({
  admin,
  savePermissions,
  revoke,
}: {
  admin: {
    userId: string;
    email: string;
    name: string;
    isOwner: boolean;
    permissions: string[];
    accountStatus: string;
  };
  savePermissions: Action;
  revoke: Action;
}) {
  const [saveState, saveAction] = useActionState<ActionResult | null, FormData>(
    savePermissions,
    null,
  );
  const [revokeState, revokeAction] = useActionState<ActionResult | null, FormData>(revoke, null);

  if (admin.isOwner) {
    return (
      <div className="py-4">
        <p className="text-sm text-ink">
          {admin.name || admin.email}
          <span className="ml-2 text-2xs uppercase text-ink-faint">owner · holds everything</span>
        </p>
        <p className="text-xs text-ink-soft">
          {admin.email} — an owner&apos;s access does not come from a list, so there is nothing to
          edit.
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
          {admin.accountStatus === "active"
            ? `${normalizeAdminGrants(admin.permissions).length} grant(s)`
            : admin.accountStatus}
        </span>
      </div>

      {saveState?.error ? <FormFeedback error={saveState.error} className="mt-2" /> : null}
      {saveState?.success ? (
        <FormFeedback success="Saved. It applies on their next request." className="mt-2" />
      ) : null}
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
              description="Their account is disabled and their areas cleared, so they cannot sign in."
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
