"use client";

import { useState } from "react";
import { LogIn, CheckCircle2, AlertCircle, X, Users } from "lucide-react";
import { useToast } from "@/src/shared_components/ui/Toast";
import { joinTeamByCodeAction } from "../actions/teamEngine.action";

interface JoinTeamModalProps {
    open: boolean;
    onClose: () => void;
    onJoined?: (team: { teamId: string; teamName: string; contextType: string }) => void;
}

export function JoinTeamModal({ open, onClose, onJoined }: JoinTeamModalProps) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joinedTeam, setJoinedTeam] = useState<{ teamId: string; teamName: string; contextType: string } | null>(null);
    const toast = useToast();

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const clean = code.trim().toUpperCase();
        if (!clean) {
            setError("Please enter a join code.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("joinCode", clean);
            const res = await joinTeamByCodeAction(formData);

            if (res.ok && res.data) {
                setJoinedTeam(res.data);
                toast.success(`Successfully joined "${res.data.teamName}"!`);
                onJoined?.(res.data);
            } else {
                setError(res.error || "Invalid join code. No team found with that code.");
            }
        } catch {
            setError("Failed to join team. Please verify your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCode("");
        setError(null);
        setJoinedTeam(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
                <button
                    type="button"
                    onClick={handleReset}
                    className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft hover:text-ink focus-visible:outline-2"
                >
                    <X className="h-5 w-5" />
                </button>

                {joinedTeam ? (
                    <div className="text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 font-display text-xl font-bold text-ink">
                            You're in!
                        </h3>
                        <p className="mt-1 text-sm text-ink-soft">
                            You have successfully joined{" "}
                            <span className="font-semibold text-ink">{joinedTeam.teamName}</span> as a member.
                        </p>
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-display text-lg font-bold text-ink">
                                    Join a Team
                                </h3>
                                <p className="text-xs text-ink-soft">
                                    Enter the team's 6-character join code
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-ink">
                                    Team Join Code
                                </label>
                                <input
                                    type="text"
                                    maxLength={8}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. 7K2M9P"
                                    autoFocus
                                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-ink placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !code.trim()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                Join Team
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
