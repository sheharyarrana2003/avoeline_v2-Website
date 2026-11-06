"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ClientDataTable } from "@/src/shared_components/ui/ClientDataTable";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { PERMISSION_GROUPS } from "@/src/lib/permissions";
import {
  accessGrantUiStatus,
  type OrganizerAccessGrantSummary,
  type TeamWithMembers,
} from "../teamEngine.types";
import { GrantInviteModal } from "./GrantInviteModal";
import {
  resendGrantInviteAction,
  revokeGrantAction,
  updateGrantAction,
} from "../actions/grants.action";

const GRANT_STATUS_LABEL = {
  invited: "Invited",
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
} as const;

export function OrganizerAccessTab({
  organizerId,
  grants,
  teams,
  events,
}: {
  organizerId: string;
  grants: OrganizerAccessGrantSummary[];
  teams: TeamWithMembers[];
  events: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [editGrant, setEditGrant] = useState<OrganizerAccessGrantSummary | null>(null);
  const [revokeGrant, setRevokeGrant] = useState<OrganizerAccessGrantSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [copyLink, setCopyLink] = useState<string | null>(null);

  const members = useMemo(() => {
    const byEmail = new Map<string, { userId: string; name: string; email: string }>();
    for (const t of teams) {
      for (const m of t.members) {
        const email = (m.email || m.user?.email || "").toLowerCase();
        if (!email) continue;
        byEmail.set(email, {
          userId: m.userId,
          name: m.displayName || m.user?.name || email,
          email,
        });
      }
    }
    return [...byEmail.values()];
  }, [teams]);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Access</h2>
          <p className="text-sm text-ink-soft">
            Invite people to the dashboard with scoped permissions. Passwords are never emailed.
          </p>
        </div>
        <button
          type="button"
          className={buttonClass("primary", "sm")}
          onClick={() => setShowInvite(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Grant access
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {flash ? <p className="text-sm text-ink">{flash}</p> : null}
      {copyLink ? (
        <div className="rounded-xl border border-line bg-muted p-3 text-sm">
          <p className="font-medium text-ink">Copy invite link</p>
          <p className="mt-1 break-all font-mono text-xs text-ink-soft">{copyLink}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => void navigator.clipboard.writeText(copyLink)}
            >
              Copy link
            </button>
            <a
              href={`/organizer/${organizerId}/settings/connections`}
              className={buttonClass("ghost", "sm")}
            >
              Connect email
            </a>
          </div>
        </div>
      ) : null}

      {!grants.length ? (
        <EmptyState
          title="No access grants yet"
          description="Invite a teammate by email or pick an existing member."
          action={
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={() => setShowInvite(true)}
            >
              Grant access
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <ClientDataTable
            rows={grants}
            getKey={(g) => g.id}
            caption="Access grants"
            columns={[
              {
                key: "person",
                header: "Person",
                cell: (g) => (
                  <div>
                    <p className="font-medium text-ink">
                      {g.granteeName || g.granteeEmail || g.granteeUserId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-ink-soft">{g.granteeEmail}</p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (g) => {
                  const st = accessGrantUiStatus(g);
                  return (
                    <StatusBadge
                      status={st === "active" ? "active" : st === "invited" ? "pending" : st}
                      label={GRANT_STATUS_LABEL[st]}
                      size="sm"
                    />
                  );
                },
              },
              {
                key: "team",
                header: "Team",
                cell: (g) => g.teamName || "—",
              },
              {
                key: "scope",
                header: "Scope",
                cell: (g) =>
                  g.scopeType === "organizer"
                    ? "All events"
                    : g.eventTitle || `Event ${g.scopeId.slice(0, 8)}…`,
              },
              {
                key: "perms",
                header: "Permissions",
                cell: (g) => (
                  <span className="line-clamp-2 text-xs text-ink-soft">
                    {g.permissions.slice(0, 4).join(", ")}
                    {g.permissions.length > 4 ? ` +${g.permissions.length - 4}` : ""}
                  </span>
                ),
              },
              {
                key: "last",
                header: "Last active",
                cell: (g) => (g.lastActiveAt ? new Date(g.lastActiveAt).toLocaleDateString() : "—"),
              },
              {
                key: "actions",
                header: "",
                cell: (g) => (
                  <div className="flex flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      className={buttonClass("ghost", "sm")}
                      onClick={() => setEditGrant(g)}
                    >
                      Edit
                    </button>
                    {!g.revokedAt ? (
                      <button
                        type="button"
                        className={buttonClass("ghost", "sm")}
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          setFlash(null);
                          setCopyLink(null);
                          start(async () => {
                            const r = await resendGrantInviteAction({
                              grantId: g.id,
                              organizerId,
                            });
                            if (!r.ok) {
                              setError(r.error.message);
                              return;
                            }
                            setFlash(r.data.message);
                            if (r.data.inviteLink) setCopyLink(r.data.inviteLink);
                            refresh();
                          });
                        }}
                      >
                        Resend
                      </button>
                    ) : null}
                    {!g.revokedAt ? (
                      <button
                        type="button"
                        className={buttonClass("ghost", "sm")}
                        onClick={() => setRevokeGrant(g)}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {showInvite ? (
        <GrantInviteModal
          organizerId={organizerId}
          events={events}
          members={members}
          onClose={() => {
            setShowInvite(false);
            refresh();
          }}
          onResult={(r) => {
            if (r.inviteLink) setCopyLink(r.inviteLink);
            if (r.message) setFlash(r.message);
          }}
        />
      ) : null}

      {editGrant ? (
        <EditGrantModal
          grant={editGrant}
          organizerId={organizerId}
          onClose={() => setEditGrant(null)}
          onSaved={() => {
            setEditGrant(null);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!revokeGrant}
        title="Revoke access?"
        description="They lose dashboard permissions immediately. You can grant access again later."
        confirmLabel="Revoke"
        tone="danger"
        busy={pending}
        onCancel={() => setRevokeGrant(null)}
        onConfirm={() => {
          if (!revokeGrant) return;
          start(async () => {
            const r = await revokeGrantAction({
              grantId: revokeGrant.id,
              organizerId,
            });
            setRevokeGrant(null);
            if (!r.ok) setError(r.error.message);
            else refresh();
          });
        }}
      />
    </div>
  );
}

function EditGrantModal({
  grant,
  organizerId,
  onClose,
  onSaved,
}: {
  grant: OrganizerAccessGrantSummary;
  organizerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grant.permissions.map((k) => [k, true])),
  );
  const [expiresAt, setExpiresAt] = useState(grant.expiresAt ? grant.expiresAt.slice(0, 16) : "");

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit grant"
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass("ghost", "sm")} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const permissions = Object.entries(selected)
                  .filter(([, v]) => v)
                  .map(([k]) => k);
                const r = await updateGrantAction({
                  grantId: grant.id,
                  organizerId,
                  permissions,
                  expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                });
                if (!r.ok) {
                  setError(r.error.message);
                  return;
                }
                onSaved();
              });
            }}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div>
          <label className={labelClass} htmlFor="edit-exp">
            Expiry
          </label>
          <input
            id="edit-exp"
            type="datetime-local"
            className={fieldClass}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.id} className="space-y-2 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium text-ink">{group.label}</legend>
            {group.permissions.map((p) => (
              <label key={p.key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!selected[p.key]}
                  onChange={() => setSelected((s) => ({ ...s, [p.key]: !s[p.key] }))}
                />
                {p.label}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}
