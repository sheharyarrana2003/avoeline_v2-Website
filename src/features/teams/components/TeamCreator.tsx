"use client";

import { useState } from "react";
import { Users, Plus, Check, Copy, Sparkles, Shield, Trophy, Link2 } from "lucide-react";
import { useToast } from "@/src/shared_components/ui/Toast";
import { createTeamAction } from "../actions/teamEngine.action";
import type { TeamContextType } from "../teamEngine.types";

interface TeamCreatorProps {
    contextType: TeamContextType;
    parentRef: string;
    eventId?: string;
    trackId?: string;
    orgId?: string;
    title?: string;
    subtitle?: string;
    onCreated?: (teamId: string, joinCode: string) => void;
}

const CONTEXT_META: Record<
    TeamContextType,
    { label: string; placeholder: string; icon: typeof Users; defaultTitle: string; defaultSubtitle: string }
> = {
    hackathon_track: {
        label: "Hackathon Team",
        placeholder: "e.g. Quantum Pioneers, ByteForge",
        icon: Trophy,
        defaultTitle: "Create Hackathon Team",
        defaultSubtitle: "Form a new team for this track. Team members can join via the generated join code.",
    },
    club_committee: {
        label: "Club Committee",
        placeholder: "e.g. Executive Board, Media & Marketing, Event Ops",
        icon: Users,
        defaultTitle: "Create Club Committee",
        defaultSubtitle: "Organize your club into functional teams and committees with designated leads.",
    },
    event_staff: {
        label: "Staff Roster",
        placeholder: "e.g. Check-in Desk, Stage Management, Security & Ops",
        icon: Shield,
        defaultTitle: "Create Staff Roster",
        defaultSubtitle: "Add an operational staff team for this event. Staff members join using the team code.",
    },
};

export function TeamCreator({
    contextType,
    parentRef,
    eventId,
    trackId,
    orgId,
    title,
    subtitle,
    onCreated,
}: TeamCreatorProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const toast = useToast();

    const meta = CONTEXT_META[contextType];
    const Icon = meta.icon;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("name", name.trim());
            formData.set("contextType", contextType);
            formData.set("parentRef", parentRef);
            if (eventId) formData.set("eventId", eventId);
            if (trackId) formData.set("trackId", trackId);
            if (orgId) formData.set("orgId", orgId);

            const res = await createTeamAction(formData);
            if (res.ok && res.data) {
                toast.success(`Team "${name}" created! Join code: ${res.data.joinCode}`);
                setCreatedCode(res.data.joinCode);
                onCreated?.(res.data.teamId, res.data.joinCode);
                setName("");
            } else {
                toast.error(res.error || "Failed to create team.");
            }
        } catch {
            toast.error("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async () => {
        if (!createdCode) return;
        await navigator.clipboard.writeText(createdCode);
        setCopied(true);
        toast.success("Join code copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
    };

    const copyLink = async () => {
        if (!createdCode) return;
        const url = `${window.location.origin}/teams/join?code=${createdCode}`;
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success("Direct invite link copied to clipboard!");
        setTimeout(() => setCopiedLink(false), 2500);
    };

    return (
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-xs">
            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-display text-base font-semibold text-ink">
                        {title || meta.defaultTitle}
                    </h3>
                    <p className="mt-1 text-xs text-ink-soft">
                        {subtitle || meta.defaultSubtitle}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={meta.placeholder}
                        required
                        disabled={loading}
                        className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    Create {meta.label}
                </button>
            </form>

            {createdCode && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs text-ink-soft">
                            Team Join Code:{" "}
                            <span className="font-mono text-sm font-bold tracking-wider text-ink">
                                {createdCode}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={copyCode}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-muted"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5 text-ink-soft" />
                                    Copy Code
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={copyLink}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-muted"
                            title="Copy direct invite link"
                        >
                            {copiedLink ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    Link Copied!
                                </>
                            ) : (
                                <>
                                    <Link2 className="h-3.5 w-3.5 text-ink-soft" />
                                    Copy Link
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
