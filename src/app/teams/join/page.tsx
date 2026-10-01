"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, LogIn, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/src/shared_components/ui/Toast";
import { joinTeamByCodeAction } from "@/src/features/teams/actions/teamEngine.action";

function JoinTeamContent() {
    const searchParams = useSearchParams();
    const initialCode = searchParams.get("code")?.toUpperCase() || "";
    const [code, setCode] = useState(initialCode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joinedTeam, setJoinedTeam] = useState<{ teamId: string; teamName: string; contextType: string } | null>(null);
    const toast = useToast();

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
            } else {
                setError(res.error || "Invalid join code. No team found with that code.");
            }
        } catch {
            setError("Failed to join team. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-12">
            <div className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Home
                </Link>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-8 shadow-xs">
                {joinedTeam ? (
                    <div className="text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
                            Welcome to the team!
                        </h1>
                        <p className="mt-2 text-sm text-ink-soft">
                            You are now a confirmed member of{" "}
                            <span className="font-semibold text-ink">{joinedTeam.teamName}</span>.
                        </p>

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setJoinedTeam(null);
                                    setCode("");
                                }}
                                className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-muted"
                            >
                                Join Another Team
                            </button>
                            <Link
                                href="/teams"
                                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                View My Teams
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="font-display text-xl font-bold text-ink">
                                    Join a Team
                                </h1>
                                <p className="text-xs text-ink-soft">
                                    Enter your team join code
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                                    Join Code
                                </label>
                                <input
                                    type="text"
                                    maxLength={8}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. 4RUSXA"
                                    autoFocus
                                    className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-ink placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <p className="mt-2 text-center text-2xs text-ink-faint">
                                    Ask your team lead or organizer for the team's join code.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !code.trim()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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
        </main>
    );
}

export default function JoinTeamPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs text-ink-soft">Loading...</div>}>
            <JoinTeamContent />
        </Suspense>
    );
}
