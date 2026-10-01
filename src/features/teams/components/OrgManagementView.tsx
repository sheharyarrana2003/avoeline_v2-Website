"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Plus, Users, ChevronRight, GraduationCap, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/src/shared_components/ui/Toast";
import { createOrgAction } from "../actions/teamEngine.action";
import { deleteOrg, updateOrg } from "@/src/features/admin/actions/tenancy.action";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import type { OrgDoc } from "../teamEngine.types";

interface OrgManagementViewProps {
    departments: OrgDoc[];
    clubs: OrgDoc[];
    plans?: { key: string; name: string }[];
    canDelete?: boolean;
}

export function OrgManagementView({
    departments: initialDepts,
    clubs: initialClubs,
    plans = [],
    canDelete = false,
}: OrgManagementViewProps) {
    const [departments, setDepartments] = useState<OrgDoc[]>(initialDepts);
    const [clubs, setClubs] = useState<OrgDoc[]>(initialClubs);
    const [activeTab, setActiveTab] = useState<"hierarchy" | "departments" | "clubs">("hierarchy");

    // Modal state
    const [modalOpen, setModalOpen] = useState<"department" | "club" | null>(null);
    const [editing, setEditing] = useState<OrgDoc | null>(null);
    const [name, setName] = useState("");
    const [parentOrgId, setParentOrgId] = useState<string>("");
    const [planKey, setPlanKey] = useState("");
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !modalOpen) return;
        if (modalOpen === "club" && !parentOrgId) {
            toast.error("Please select a parent department for this club.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("name", name.trim());
            formData.set("type", modalOpen);
            if (modalOpen === "club") formData.set("parentOrgId", parentOrgId);

            const res = await createOrgAction(formData);
            if (res.ok && res.data) {
                const newDoc: OrgDoc = {
                    id: res.data.orgId,
                    name: name.trim(),
                    type: modalOpen,
                    parentOrgId: modalOpen === "club" ? parentOrgId : null,
                    ownerUid: "current",
                    createdAt: new Date().toISOString(),
                };

                if (modalOpen === "department") {
                    setDepartments((prev) => [newDoc, ...prev]);
                    toast.success(`Department "${name}" created.`);
                } else {
                    setClubs((prev) => [newDoc, ...prev]);
                    toast.success(`Club "${name}" created.`);
                }

                setName("");
                setParentOrgId("");
                setModalOpen(null);
            } else {
                toast.error(res.error || "Failed to create organization.");
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (org: OrgDoc) => {
        setEditing(org);
        setName(org.name);
        setParentOrgId(org.parentOrgId || departments[0]?.id || "");
        setPlanKey(plans[0]?.key || "");
    };

    const orgActions = (org: OrgDoc) => (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => openEdit(org)}
                className="text-2xs font-semibold uppercase text-ink-soft hover:text-ink"
            >
                Edit
            </button>
            {canDelete ? (
                <form action={deleteOrg}>
                    <input type="hidden" name="orgId" value={org.id} />
                    <ConfirmSubmit
                        tone="danger"
                        title={`Delete ${org.name}?`}
                        description="This removes the folder, child clubs if this is a department, and those logins from Supabase Auth."
                        confirmLabel="Delete"
                        className="text-2xs font-semibold uppercase text-danger hover:underline"
                    >
                        Delete
                    </ConfirmSubmit>
                </form>
            ) : null}
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Topbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-ink">
                        University Organizations & Clubs
                    </h1>
                    <p className="mt-1 text-sm text-ink-soft">
                        Manage university departments and student clubs. Each club's parent department models the campus hierarchy.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setName("");
                            setModalOpen("department");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-2xs hover:bg-muted"
                    >
                        <Plus className="h-4 w-4 text-ink-soft" />
                        Add Department
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setName("");
                            setParentOrgId(departments[0]?.id || "");
                            setModalOpen("club");
                        }}
                        disabled={departments.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                        title={departments.length === 0 ? "Create a department first" : undefined}
                    >
                        <Plus className="h-4 w-4" />
                        Add Club
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 border-b border-line pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab("hierarchy")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        activeTab === "hierarchy"
                            ? "bg-primary text-white"
                            : "text-ink-soft hover:bg-muted hover:text-ink"
                    }`}
                >
                    Hierarchy View
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("departments")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        activeTab === "departments"
                            ? "bg-primary text-white"
                            : "text-ink-soft hover:bg-muted hover:text-ink"
                    }`}
                >
                    Departments ({departments.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("clubs")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        activeTab === "clubs"
                            ? "bg-primary text-white"
                            : "text-ink-soft hover:bg-muted hover:text-ink"
                    }`}
                >
                    Clubs ({clubs.length})
                </button>
            </div>

            {/* Content view */}
            {activeTab === "hierarchy" && (
                <div className="space-y-6">
                    {departments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-line bg-paper p-12 text-center">
                            <GraduationCap className="mx-auto h-8 w-8 text-ink-faint" />
                            <h3 className="mt-3 font-display text-base font-semibold text-ink">
                                No departments created yet
                            </h3>
                            <p className="mt-1 text-xs text-ink-soft">
                                Start by adding your university's departments (e.g. Computer Science, Business School).
                            </p>
                            <button
                                type="button"
                                onClick={() => setModalOpen("department")}
                                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
                            >
                                <Plus className="h-4 w-4" />
                                Add First Department
                            </button>
                        </div>
                    ) : (
                        departments.map((dept) => {
                            const deptClubs = clubs.filter((c) => c.parentOrgId === dept.id);

                            return (
                                <div
                                    key={dept.id}
                                    className="overflow-hidden rounded-2xl border border-line bg-paper shadow-xs"
                                >
                                    {/* Department header */}
                                    <div className="flex items-center justify-between border-b border-line bg-muted/20 px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                <GraduationCap className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-display text-lg font-bold text-ink">
                                                        {dept.name}
                                                    </h3>
                                                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-2xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                        Department
                                                    </span>
                                                </div>
                                                <p className="text-xs text-ink-soft">
                                                    {deptClubs.length} {deptClubs.length === 1 ? "affiliated club" : "affiliated clubs"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {orgActions(dept)}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setName("");
                                                    setParentOrgId(dept.id);
                                                    setModalOpen("club");
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-muted"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add Club to {dept.name}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Clubs under this department */}
                                    <div className="p-6">
                                        {deptClubs.length === 0 ? (
                                            <p className="text-xs italic text-ink-faint">
                                                No clubs registered under this department yet.
                                            </p>
                                        ) : (
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                {deptClubs.map((club) => (
                                                    <div
                                                        key={club.id}
                                                        className="flex flex-col justify-between rounded-xl border border-line bg-canvas p-4"
                                                    >
                                                        <Link href={`/admin/orgs/${club.id}`} className="group">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                                    <Building2 className="h-4 w-4" />
                                                                </div>
                                                                <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-medium text-ink-soft">
                                                                    Club
                                                                </span>
                                                            </div>
                                                            <h4 className="mt-3 font-display text-sm font-bold text-ink group-hover:text-primary">
                                                                {club.name}
                                                            </h4>
                                                        </Link>
                                                        <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                                                            <Link
                                                                href={`/admin/orgs/${club.id}`}
                                                                className="flex items-center gap-1 text-xs text-primary"
                                                            >
                                                                Manage
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            </Link>
                                                            {orgActions(club)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Department List View */}
            {activeTab === "departments" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((dept) => (
                        <div key={dept.id} className="rounded-xl border border-line bg-paper p-5 shadow-xs">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                        <GraduationCap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-display text-base font-bold text-ink">{dept.name}</h4>
                                        <span className="text-xs text-ink-soft">Department</span>
                                    </div>
                                </div>
                                {orgActions(dept)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Club List View */}
            {activeTab === "clubs" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {clubs.map((club) => {
                        const parent = departments.find((d) => d.id === club.parentOrgId);
                        return (
                            <div key={club.id} className="rounded-xl border border-line bg-paper p-5 shadow-xs">
                                <div className="flex items-start justify-between gap-3">
                                    <Link href={`/admin/orgs/${club.id}`} className="group flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-display text-base font-bold text-ink group-hover:text-primary">
                                                {club.name}
                                            </h4>
                                            <p className="text-xs text-ink-soft">
                                                Dept: {parent?.name || "Unassigned"}
                                            </p>
                                        </div>
                                    </Link>
                                    {orgActions(club)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
                        <button
                            type="button"
                            onClick={() => setModalOpen(null)}
                            className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft hover:text-ink focus-visible:outline-2"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="font-display text-lg font-bold text-ink">
                            {modalOpen === "department" ? "Add Department" : "Add Student Club"}
                        </h3>
                        <p className="mt-1 text-xs text-ink-soft">
                            {modalOpen === "department"
                                ? "Departments represent academic faculties or schools (e.g. Faculty of Engineering)."
                                : "Clubs represent student societies belonging to a parent department."}
                        </p>

                        <form onSubmit={handleCreate} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-ink">
                                    {modalOpen === "department" ? "Department Name" : "Club Name"}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={
                                        modalOpen === "department"
                                            ? "e.g. Department of Computer Science"
                                            : "e.g. ACM Student Chapter, Robotics Club"
                                    }
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {modalOpen === "club" && (
                                <div>
                                    <label className="block text-xs font-semibold text-ink">
                                        Parent Department
                                    </label>
                                    <select
                                        value={parentOrgId}
                                        onChange={(e) => setParentOrgId(e.target.value)}
                                        required
                                        className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Select a department...</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(null)}
                                    className="rounded-xl border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim()}
                                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : `Create ${modalOpen === "department" ? "Department" : "Club"}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editing ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft hover:text-ink"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <h3 className="font-display text-lg font-bold text-ink">Edit {editing.type}</h3>
                        <form action={updateOrg} className="mt-5 space-y-4">
                            <input type="hidden" name="orgId" value={editing.id} />
                            <label className="block text-xs font-semibold text-ink">
                                Name
                                <input
                                    name="name"
                                    defaultValue={editing.name}
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink"
                                />
                            </label>
                            {editing.type === "club" ? (
                                <label className="block text-xs font-semibold text-ink">
                                    Parent department
                                    <select
                                        name="parentOrgId"
                                        defaultValue={editing.parentOrgId || ""}
                                        required
                                        className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink"
                                    >
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : null}
                            {plans.length > 0 && editing.ownerUid ? (
                                <label className="block text-xs font-semibold text-ink">
                                    Plan
                                    <select
                                        name="planKey"
                                        defaultValue={planKey}
                                        className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink"
                                    >
                                        <option value="">Keep current</option>
                                        {plans.map((p) => (
                                            <option key={p.key} value={p.key}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : null}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="rounded-xl border border-line px-4 py-2 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
