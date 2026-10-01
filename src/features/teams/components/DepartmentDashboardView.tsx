"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { Building2, Plus, Users, Shield, ArrowRight, UserCheck, ExternalLink, Mail, CheckCircle2 } from "lucide-react";
import type { OrgDoc } from "../teamEngine.types";
import { addClubUnderDepartmentAction, assignClubOwnerAction } from "../actions/department.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import type { ActionResult } from "@/src/lib/action";

interface DepartmentDashboardViewProps {
    department: OrgDoc;
    clubs: OrgDoc[];
    isPlatformAdmin: boolean;
    allDepartments?: OrgDoc[];
}

export function DepartmentDashboardView({
    department,
    clubs,
    isPlatformAdmin,
    allDepartments = [],
}: DepartmentDashboardViewProps) {
    const [isAddClubOpen, setIsAddClubOpen] = useState(false);
    const [assignTargetClub, setAssignTargetClub] = useState<OrgDoc | null>(null);

    // Bound actions
    const boundAddClub = addClubUnderDepartmentAction.bind(null, department.id);
    const [addClubState, addClubFormAction] = useActionState<ActionResult | null, FormData>(
        async (prev, fd) => {
            const res = await boundAddClub(prev, fd);
            if (res.success) setIsAddClubOpen(false);
            return res;
        },
        null
    );

    const boundAssignOwner = assignTargetClub
        ? assignClubOwnerAction.bind(null, assignTargetClub.id, department.id)
        : null;

    const [assignState, assignFormAction] = useActionState<ActionResult | null, FormData>(
        async (prev, fd) => {
            if (!boundAssignOwner) return null;
            const res = await boundAssignOwner(prev, fd);
            if (res.success) setAssignTargetClub(null);
            return res;
        },
        null
    );

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
                <div>
                    <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-primary">
                        <Building2 className="h-4 w-4" />
                        <span>Department / Enterprise Account</span>
                    </div>
                    <h1 className="mt-1 font-display text-3xl font-bold text-ink">
                        {department.name}
                    </h1>
                    <p className="mt-1 text-sm text-ink-soft">
                        Manage clubs, student organizations, and assign club presidents under this department.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {isPlatformAdmin && allDepartments.length > 1 && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-ink-soft">Department Switcher:</span>
                            <select
                                value={department.id}
                                onChange={(e) => {
                                    window.location.href = `/department?orgId=${e.target.value}`;
                                }}
                                className={fieldClass + " py-1 px-2 text-xs"}
                            >
                                {allDepartments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={() => setIsAddClubOpen(true)}
                        className={buttonClass("primary", "md")}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Club Under Department
                    </button>
                </div>
            </div>

            {/* Department Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-line bg-paper p-5 shadow-xs">
                    <p className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
                        Affiliated Clubs
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold text-ink">
                        {clubs.length}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                        Active student societies & clubs
                    </p>
                </div>

                <div className="rounded-2xl border border-line bg-paper p-5 shadow-xs">
                    <p className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
                        Assigned Presidents
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold text-ink">
                        {clubs.filter((c) => Boolean(c.ownerUid)).length}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                        Clubs with active designated owners
                    </p>
                </div>

                <div className="rounded-2xl border border-line bg-paper p-5 shadow-xs">
                    <p className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
                        Department Standing
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Active Verified Department</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                        ID: <span className="font-mono text-2xs">{department.id}</span>
                    </p>
                </div>
            </div>

            {/* Clubs list */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg text-ink font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Department Clubs ({clubs.length})
                    </h2>
                </div>

                {clubs.length === 0 ? (
                    <div className="rounded-2xl border border-line bg-paper p-12 text-center">
                        <Building2 className="mx-auto h-12 w-12 text-ink-faint" />
                        <h3 className="mt-4 font-display text-base font-semibold text-ink">
                            No clubs registered under this department yet
                        </h3>
                        <p className="mt-1 text-xs text-ink-soft max-w-sm mx-auto">
                            Add a new club or student organization to enable club presidents and committees to organize events.
                        </p>
                        <button
                            onClick={() => setIsAddClubOpen(true)}
                            className={buttonClass("primary", "sm", "mt-6")}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add First Club
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clubs.map((club) => (
                            <div
                                key={club.id}
                                className="rounded-2xl border border-line bg-paper p-6 shadow-xs hover:border-line-loud transition flex flex-col justify-between gap-4"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-display text-lg font-semibold text-ink truncate">
                                            {club.name}
                                        </h3>
                                        <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-2xs font-semibold uppercase text-primary">
                                            Club
                                        </span>
                                    </div>

                                    <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
                                        <div className="flex items-center gap-1.5">
                                            <Shield className="h-3.5 w-3.5 text-ink-soft" />
                                            <span>Club Owner UID:</span>
                                            {club.ownerUid ? (
                                                <span className="font-mono text-ink text-2xs bg-muted px-1.5 py-0.5 rounded">
                                                    {club.ownerUid}
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                    Unassigned
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-line/60 pt-4 mt-2">
                                    <button
                                        onClick={() => setAssignTargetClub(club)}
                                        className={buttonClass("secondary", "sm")}
                                    >
                                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                                        {club.ownerUid ? "Reassign Owner" : "Assign Owner"}
                                    </button>

                                    <Link
                                        href={`/clubs/${club.id}`}
                                        className={buttonClass("primary", "sm")}
                                    >
                                        <span>Manage Club</span>
                                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Add Club */}
            {isAddClubOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                            <h3 className="font-display text-lg font-semibold text-ink">
                                Add Club under {department.name}
                            </h3>
                            <button
                                onClick={() => setIsAddClubOpen(false)}
                                className="text-ink-soft hover:text-ink text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form action={addClubFormAction} className="space-y-4">
                            {addClubState?.error && <FormFeedback error={addClubState.error} />}

                            <div>
                                <label className={labelClass}>Club / Society Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. ACM Student Chapter, Robotics Club"
                                    className={fieldClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Assigned Club Owner Email <span className="normal-case text-ink-soft">(optional)</span>
                                </label>
                                <input
                                    type="email"
                                    name="ownerEmail"
                                    placeholder="president@university.edu"
                                    className={fieldClass}
                                />
                                <p className="text-2xs text-ink-soft mt-1">
                                    You can assign a club president now or leave it unassigned to configure later.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddClubOpen(false)}
                                    className={buttonClass("secondary", "md")}
                                >
                                    Cancel
                                </button>
                                <SubmitButton pendingText="Creating…" className={buttonClass("primary", "md")}>
                                    Create Club
                                </SubmitButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Assign Owner */}
            {assignTargetClub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                            <h3 className="font-display text-lg font-semibold text-ink">
                                Assign Owner for {assignTargetClub.name}
                            </h3>
                            <button
                                onClick={() => setAssignTargetClub(null)}
                                className="text-ink-soft hover:text-ink text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form action={assignFormAction} className="space-y-4">
                            {assignState?.error && <FormFeedback error={assignState.error} />}

                            <p className="text-xs text-ink-soft">
                                Enter the email address of the registered user who will serve as the Club President / Organizer for <strong>{assignTargetClub.name}</strong>.
                            </p>

                            <div>
                                <label className={labelClass}>User Email *</label>
                                <input
                                    type="email"
                                    name="ownerEmail"
                                    required
                                    placeholder="president@university.edu"
                                    className={fieldClass}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignTargetClub(null)}
                                    className={buttonClass("secondary", "md")}
                                >
                                    Cancel
                                </button>
                                <SubmitButton pendingText="Assigning…" className={buttonClass("primary", "md")}>
                                    Assign Owner
                                </SubmitButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
