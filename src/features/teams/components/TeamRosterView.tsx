"use client";

import { useState } from "react";
import { Users, Crown, UserMinus, ArrowDownCircle, Copy, Check, Link2 } from "lucide-react";
import { useToast } from "@/src/shared_components/ui/Toast";
import {
  updateMemberRoleAction,
  removeTeamMemberAction,
  addDirectMemberAction,
  renameTeamAction,
  deleteTeamAction,
  updateDirectMemberAction,
} from "../actions/teamEngine.action";
import type { TeamMemberDoc, TeamWithMembers, TeamMemberRole } from "../teamEngine.types";

interface TeamRosterViewProps {
  team: TeamWithMembers;
  currentUserId?: string;
  isOrganizerOrAdmin?: boolean;
  allowJoinCodes?: boolean;
  allowDirectAdd?: boolean;
  canEditTeam?: boolean;
  canRemoveMembers?: boolean;
  canChangeRoles?: boolean;
  canEditMembers?: boolean;
}

export function TeamRosterView({
  team,
  currentUserId,
  isOrganizerOrAdmin = false,
  allowJoinCodes,
  allowDirectAdd = false,
  canEditTeam = false,
  canRemoveMembers = false,
  canChangeRoles = false,
  canEditMembers = false,
}: TeamRosterViewProps) {
  const showJoinCodes = allowJoinCodes ?? team.contextType !== "event_staff";
  const [members, setMembers] = useState<TeamMemberDoc[]>(team.members || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const toast = useToast();

  // Check if the current user is a lead of this team
  const isCurrentUserLead =
    isOrganizerOrAdmin || members.some((m) => m.userId === currentUserId && m.role === "lead");

  const handleRoleChange = async (memberId: string, newRole: TeamMemberRole) => {
    setLoadingId(memberId);
    try {
      const formData = new FormData();
      formData.set("teamId", team.id);
      formData.set("memberId", memberId);
      formData.set("role", newRole);

      const res = await updateMemberRoleAction(formData);
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) =>
            newRole === "lead"
              ? { ...m, role: m.id === memberId ? "lead" : m.role === "lead" ? "member" : m.role }
              : m.id === memberId
                ? { ...m, role: newRole }
                : m,
          ),
        );
        toast.success(`Role updated to ${newRole}.`);
      } else {
        toast.error(res.error || "Failed to update role.");
      }
    } catch {
      toast.error("Failed to change role.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this team?`)) return;

    setLoadingId(memberId);
    try {
      const formData = new FormData();
      formData.set("teamId", team.id);
      formData.set("memberId", memberId);

      const res = await removeTeamMemberAction(formData);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast.success(`${memberName} was removed from the team.`);
      } else {
        toast.error(res.error || "Failed to remove member.");
      }
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setLoadingId(null);
    }
  };

  const copyJoinCode = async () => {
    await navigator.clipboard.writeText(team.joinCode);
    setCopied(true);
    toast.success("Join code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/teams/join?code=${team.joinCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Direct invite link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-muted/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-base font-bold text-ink">{team.name}</h4>
              <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-semibold capitalize text-ink-soft">
                {team.contextType.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditTeam ? (
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("teamId", team.id);
                const res = await renameTeamAction(fd);
                if (res.success) {
                  toast.success("Team renamed.");
                  window.location.reload();
                } else toast.error(res.error || "Could not rename.");
              }}
            >
              <input
                name="name"
                defaultValue={team.name}
                aria-label="Team name"
                className="w-40 rounded-lg border border-line bg-paper px-2 py-1 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg border border-line px-2 py-1 text-xs font-medium"
              >
                Rename
              </button>
            </form>
          ) : null}
          {canEditTeam ? (
            <button
              type="button"
              className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600"
              onClick={async () => {
                if (!confirm(`Delete ${team.name}? Members are removed from this roster.`)) return;
                const fd = new FormData();
                fd.set("teamId", team.id);
                const res = await deleteTeamAction(fd);
                if (res.success) {
                  toast.success("Team deleted.");
                  window.location.reload();
                } else toast.error(res.error || "Could not delete.");
              }}
            >
              Delete
            </button>
          ) : null}
          {showJoinCodes ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs shadow-2xs">
                <span className="text-ink-soft">Code:</span>
                <span className="font-mono font-bold tracking-wider text-ink">{team.joinCode}</span>
                <button
                  type="button"
                  onClick={copyJoinCode}
                  className="rounded-md p-1 text-ink-soft transition hover:bg-muted hover:text-ink"
                  title="Copy join code"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={copyInviteLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink shadow-2xs transition hover:bg-muted"
                title="Copy direct invite link for your team"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5 text-ink-soft" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="p-8 text-center text-xs text-ink-soft">
          No members have joined this team yet.
          {showJoinCodes
            ? " Share the join code to invite members."
            : " Add a member with the form below."}
        </div>
      ) : (
        <div className="divide-y divide-line">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isLead = member.role === "lead";
            const isBusy = loadingId === member.id;
            const name = member.user?.name || member.displayName || "Team Member";
            const email = member.user?.email || member.email || "";

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 transition hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-semibold text-ink">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {name}
                        {isSelf && <span className="ml-1.5 text-2xs text-ink-soft">(You)</span>}
                      </span>
                      {isLead ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-2xs font-semibold text-purple-600 dark:text-purple-400">
                          <Crown className="h-3 w-3" />
                          Lead
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-medium text-ink-soft">
                          Member
                        </span>
                      )}
                    </div>
                    {email && <p className="text-xs text-ink-soft">{email}</p>}
                    {member.phone ? <p className="text-xs text-ink-soft">{member.phone}</p> : null}
                    {canEditMembers ? (
                      <form
                        className="mt-2 flex flex-wrap gap-2"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          fd.set("teamId", team.id);
                          fd.set("memberId", member.id);
                          const res = await updateDirectMemberAction(fd);
                          if (res.success) {
                            toast.success("Member updated.");
                            window.location.reload();
                          } else toast.error(res.error || "Could not update that member.");
                        }}
                      >
                        <input
                          name="name"
                          defaultValue={name}
                          aria-label="Edit name"
                          className="w-28 rounded-lg border border-line px-2 py-1 text-xs"
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={email}
                          aria-label="Edit email"
                          className="w-36 rounded-lg border border-line px-2 py-1 text-xs"
                        />
                        <input
                          name="phone"
                          defaultValue={member.phone || ""}
                          aria-label="Edit phone"
                          className="w-28 rounded-lg border border-line px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-line px-2 py-1 text-xs font-medium"
                        >
                          Save
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                {/* Actions for leads / admin */}
                {isCurrentUserLead && !isSelf && (canChangeRoles || canRemoveMembers) && (
                  <div className="flex items-center gap-1.5">
                    {canChangeRoles ? (
                      isLead ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRoleChange(member.id, "member")}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:bg-muted hover:text-ink disabled:opacity-50"
                          title="Demote to member"
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                          Demote
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRoleChange(member.id, "lead")}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-purple-600 transition hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50"
                          title="Promote to lead"
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Make Lead
                        </button>
                      )
                    ) : null}

                    {canRemoveMembers ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemoveMember(member.id, name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400 disabled:opacity-50"
                        title="Remove from team"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {allowDirectAdd ? (
        <form
          className="grid gap-2 border-t border-line px-6 py-4 sm:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            fd.set("teamId", team.id);
            const res = await addDirectMemberAction(fd);
            if (res.success) {
              toast.success("Member added.");
              form.reset();
              window.location.reload();
            } else {
              toast.error(res.error || "Could not add that member.");
            }
          }}
        >
          <input
            name="name"
            required
            placeholder="Name"
            aria-label="Member name"
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            aria-label="Member email"
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
          <input
            name="phone"
            placeholder="Phone"
            aria-label="Member phone"
            className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Add member
          </button>
        </form>
      ) : null}
    </div>
  );
}
