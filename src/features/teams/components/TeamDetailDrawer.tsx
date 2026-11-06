"use client";

import { useMemo, useState, useTransition } from "react";
import { Crown, Download, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { useToast } from "@/src/shared_components/ui/Toast";
import {
  deleteTeamAction,
  removeTeamMemberAction,
  updateMemberRoleAction,
} from "../actions/teamEngine.action";
import {
  ACCESS_STATUS_LABEL,
  accessStatusForMember,
  countActiveAccessForTeam,
  initialFromName,
  memberDisplayName,
  memberEmail,
  parseMemberExtra,
} from "../organizerTeams.helpers";
import type {
  OrganizerAccessGrantSummary,
  TeamMemberDoc,
  TeamPositionDoc,
  TeamWithMembers,
} from "../teamEngine.types";
import { EditMemberModal } from "./EditMemberModal";
import { EditTeamModal } from "./EditTeamModal";
import { ExportTeamsModal } from "./ExportTeamsModal";
import { GrantInviteModal } from "./GrantInviteModal";
import { EntityFilesPanel } from "@/src/features/connections/components/EntityFilesPanel";

export function TeamDetailDrawer({
  team,
  organizerId,
  advanced,
  assignmentCount,
  grants,
  positions,
  onClose,
  onAddMember,
}: {
  team: TeamWithMembers;
  organizerId: string;
  advanced: boolean;
  assignmentCount: number;
  grants: OrganizerAccessGrantSummary[];
  positions: TeamPositionDoc[];
  onClose: () => void;
  onAddMember: (teamId: string) => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMemberDoc | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDoc | null>(null);

  const accessCount = useMemo(() => countActiveAccessForTeam(team, grants), [team, grants]);
  const positionsById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  function makeLead(member: TeamMemberDoc) {
    setBusyId(member.id);
    start(async () => {
      const fd = new FormData();
      fd.set("teamId", team.id);
      fd.set("memberId", member.id);
      fd.set("role", "lead");
      const res = await updateMemberRoleAction(fd);
      if (res.success) toast.success(`${memberDisplayName(member)} is now lead.`);
      else toast.error(res.error || "Could not update role.");
      setBusyId(null);
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const member = removeTarget;
    setRemoveTarget(null);
    setBusyId(member.id);
    start(async () => {
      const fd = new FormData();
      fd.set("teamId", team.id);
      fd.set("memberId", member.id);
      const res = await removeTeamMemberAction(fd);
      if (res.success) toast.success(`${memberDisplayName(member)} removed.`);
      else toast.error(res.error || "Could not remove that member.");
      setBusyId(null);
    });
  }

  function confirmDelete() {
    start(async () => {
      const fd = new FormData();
      fd.set("teamId", team.id);
      const res = await deleteTeamAction(fd);
      if (res.success) {
        toast.success(`Team “${team.name}” deleted.`);
        setDeleteOpen(false);
        onClose();
      } else {
        toast.error(res.error || "Could not delete that team.");
        setDeleteOpen(false);
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" role="dialog" aria-modal>
        <button type="button" className="flex-1" aria-label="Close drawer" onClick={onClose} />
        <aside className="flex h-full w-full max-w-lg flex-col bg-paper shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-display text-xl text-ink">{team.name}</h2>
              <p className="mt-1 text-xs text-ink-soft">
                {team.members.length} member{team.members.length === 1 ? "" : "s"} ·{" "}
                {assignmentCount} event
                {assignmentCount === 1 ? "" : "s"} · {accessCount} with access
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-ink-soft hover:bg-muted hover:text-ink"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
            {advanced ? (
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => setEditTeamOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit team
              </button>
            ) : null}
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => onAddMember(team.id)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add member
            </button>
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setExportOpen(true)}
            >
              <Download className="h-3.5 w-3.5" />
              Export team
            </button>
            {advanced ? (
              <button
                type="button"
                className={buttonClass("destructive", "sm")}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete team
              </button>
            ) : null}
          </div>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {team.members.map((m) => {
              const name = memberDisplayName(m);
              const email = memberEmail(m);
              const access = accessStatusForMember(m, grants);
              const pos = m.positionId ? positionsById.get(m.positionId) : undefined;
              const designation = parseMemberExtra(m.extra).designation;
              const roleLabel = m.role === "lead" ? "Lead" : pos?.title || designation || "Member";
              const busy = busyId === m.id || pending;

              return (
                <li key={m.id} className="rounded-xl border border-line bg-paper px-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-semibold text-ink">
                      {initialFromName(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{name}</p>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-medium text-ink-soft">
                          {roleLabel}
                        </span>
                        <span className="text-2xs text-ink-soft">
                          {ACCESS_STATUS_LABEL[access]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-soft">{email || "—"}</p>
                      {m.phone ? <p className="text-xs text-ink-soft">{m.phone}</p> : null}
                      <p className="mt-1 text-2xs text-ink-faint">
                        Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {advanced ? (
                          <button
                            type="button"
                            className={buttonClass("ghost", "sm")}
                            disabled={busy}
                            onClick={() => setEditMember(m)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {advanced && m.role !== "lead" ? (
                          <button
                            type="button"
                            className={buttonClass("ghost", "sm")}
                            disabled={busy}
                            onClick={() => makeLead(m)}
                          >
                            <Crown className="h-3.5 w-3.5" />
                            Make lead
                          </button>
                        ) : null}
                        {advanced ? (
                          <button
                            type="button"
                            className={buttonClass("ghost", "sm")}
                            disabled={busy}
                            onClick={() => setRemoveTarget(m)}
                          >
                            Remove
                          </button>
                        ) : null}
                        {advanced && email ? (
                          <button
                            type="button"
                            className={buttonClass("ghost", "sm")}
                            disabled={busy}
                            onClick={() => setGrantEmail(email)}
                          >
                            Grant access
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {!team.members.length ? (
              <li className="px-2 py-8 text-center text-sm text-ink-soft">No members yet.</li>
            ) : null}
          </ul>
        </aside>
      </div>

      <div className="border-t border-line px-4 py-4">
        <EntityFilesPanel
          ownerType="user"
          ownerId={organizerId}
          entityType="team"
          entityId={team.id}
          connectionsHrefOwnerId={organizerId}
        />
      </div>

      <EditTeamModal open={editTeamOpen} onClose={() => setEditTeamOpen(false)} team={team} />
      <EditMemberModal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        team={team}
        member={editMember}
        positions={positions}
        advanced={advanced}
      />
      {exportOpen ? (
        <ExportTeamsModal
          teams={[team]}
          positionsByMember={new Map()}
          scope={{ kind: "organizer", organizerId }}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
      {grantEmail ? (
        <GrantInviteModal
          organizerId={organizerId}
          initialEmail={grantEmail}
          onClose={() => setGrantEmail(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${team.name}?`}
        description={`This removes ${team.members.length} member${team.members.length === 1 ? "" : "s"} from the roster${assignmentCount ? `, clears ${assignmentCount} event assignment${assignmentCount === 1 ? "" : "s"}` : ""}${accessCount ? `, and revokes ${accessCount} active/pending access grant${accessCount === 1 ? "" : "s"} for people not on another team` : ""}. Auth accounts are never deleted.`}
        confirmLabel="Delete team"
        confirmPhrase={team.name}
        confirmPhraseLabel="Type the team name to confirm"
        busy={pending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member?"
        description={
          removeTarget
            ? `Remove ${memberDisplayName(removeTarget)} from ${team.name}? Their Auth account is kept.`
            : ""
        }
        confirmLabel="Remove"
        busy={pending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
