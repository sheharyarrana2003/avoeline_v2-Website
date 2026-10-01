"use client";

import { useState } from "react";
import { Users, Crown, UserMinus, ShieldAlert, ArrowUpCircle, ArrowDownCircle, Copy, Check, Sparkles, Link2 } from "lucide-react";
import { useToast } from "@/src/shared_components/ui/Toast";
import { updateMemberRoleAction, removeTeamMemberAction } from "../actions/teamEngine.action";
import type { TeamMemberDoc, TeamWithMembers, TeamMemberRole } from "../teamEngine.types";

interface TeamRosterViewProps {
    team: TeamWithMembers;
    currentUserId?: string;
    isOrganizerOrAdmin?: boolean;
}

export function TeamRosterView({ team, currentUserId, isOrganizerOrAdmin = false }: TeamRosterViewProps) {
    const [members, setMembers] = useState<TeamMemberDoc[]>(team.members || []);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const toast = useToast();

    // Check if the current user is a lead of this team
    const isCurrentUserLead =
        isOrganizerOrAdmin ||
        members.some((m) => m.userId === currentUserId && m.role === "lead");

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
                    prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
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

                {/* Join code chip & action buttons */}
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
            </div>

            {/* Members list */}
            {members.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-soft">
                    No members have joined this team yet. Share the join code to invite members.
                </div>
            ) : (
                <div className="divide-y divide-line">
                    {members.map((member) => {
                        const isSelf = member.userId === currentUserId;
                        const isLead = member.role === "lead";
                        const isBusy = loadingId === member.id;
                        const name = member.user?.name || "Team Member";
                        const email = member.user?.email || "";

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
                                                {isSelf && (
                                                    <span className="ml-1.5 text-2xs text-ink-soft">(You)</span>
                                                )}
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
                                    </div>
                                </div>

                                {/* Actions for leads / admin */}
                                {isCurrentUserLead && !isSelf && (
                                    <div className="flex items-center gap-1.5">
                                        {isLead ? (
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
                                        )}

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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
