import Link from "next/link";
import { FolderTree, ListChecks, Plus, ShieldCheck, Sparkles } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { AuthService } from "@/src/features/auth/authService";
import { promoteToAdminAction } from "@/src/features/auth/actions/promoteToAdmin.action";
import { listTaxonomy } from "@/src/features/taxonomy/taxonomy.service";
import {
    formatFieldLines,
    kindLabel,
    ofKind,
    type TaxonomyEntry,
    type TaxonomyKind,
} from "@/src/features/taxonomy/types";
import {
    decideRequestAction,
    seedTaxonomyAction,
    upsertTaxonomyAction,
} from "@/src/features/taxonomy/actions/taxonomy.action";

const FIELD_SYNTAX_HINT = "One per line: Label* | type | option, option — where * means required and type is text, number, dropdown or checkbox.";

export default async function AdminCategoriesPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; edit?: string; e?: string }>;
}) {
    const sp = await searchParams;
    const tab = sp.tab === "format" || sp.tab === "requests" ? sp.tab : "super";
    const all = await listTaxonomy();

    // How did this visitor qualify? The layout has already let them in, so either
    // their account really is userType "admin", or they matched the
    // PLATFORM_ADMIN_EMAILS bootstrap allowlist. Only the latter is offered the
    // promotion, and the offer disappears once the role is real.
    const viewer = await AuthService.getCurrentUser();
    const viaEnvBootstrap = String(viewer?.userType ?? "").toLowerCase() !== "admin";

    // The taxonomy tables show the live vocabulary; anything still pending or
    // declined lives in the Requests tab, so a rejected name never sits in the
    // dropdown's own table looking like a deactivated category.
    const approved = all.filter((e) => e.status === "approved");
    const requests = all
        .filter((e) => e.status !== "approved")
        .sort((a, b) => {
            if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
            return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
        });

    const tabs = [
        { label: "Super categories", value: "super", href: "/admin?tab=super", count: ofKind(approved, "super").length },
        { label: "Event formats", value: "format", href: "/admin?tab=format", count: ofKind(approved, "format").length },
        { label: "Requests", value: "requests", href: "/admin?tab=requests", count: requests.filter((r) => r.status === "pending").length },
    ];

    return (
        <>
            <PageHeader
                title="Event categories"
                description="Super categories and event formats organizers choose from. Changes take effect on the next event created — existing events keep the category they were created with."
            />

            {sp.e ? <FormFeedback error={sp.e} className="mb-6" /> : null}

            {viaEnvBootstrap ? (
                <Card tone="raised" className="mb-6">
                    <CardBody>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="max-w-xl">
                                <h2 className="flex items-center gap-2 font-display text-base text-ink">
                                    <ShieldCheck size={16} aria-hidden="true" />
                                    You are here on the bootstrap allowlist
                                </h2>
                                <p className="mt-1 text-sm text-ink-soft">
                                    This account is <strong>{viewer?.userType || "not an admin"}</strong>; access is coming from
                                    <code className="mx-1 rounded bg-muted px-1 text-2xs">PLATFORM_ADMIN_EMAILS</code>.
                                    Promoting makes it a real admin account, after which you can remove that variable.
                                    It <strong>replaces</strong> the account&apos;s current role — promote a dedicated
                                    account, not one that runs events.
                                </p>
                            </div>
                            <form action={promoteToAdminAction}>
                                <ConfirmSubmit
                                    title="Make this account a platform admin?"
                                    description={`${viewer?.email || "This account"} becomes userType "admin" and STOPS being ${viewer?.userType || "its current role"} — it will lose access to those pages. You will be signed out so the new role takes effect, because the session only picks up a role change at login.`}
                                    confirmLabel="Promote and sign out"
                                    className={buttonClass("primary")}
                                >
                                    Promote this account to admin
                                </ConfirmSubmit>
                            </form>
                        </div>
                    </CardBody>
                </Card>
            ) : null}

            <FilterTabs tabs={tabs} activeValue={tab} label="Category management sections" />

            {tab === "requests" ? (
                <RequestsQueue requests={requests} />
            ) : (
                <TaxonomyManager kind={tab} entries={ofKind(approved, tab)} editId={sp.edit} allEmpty={all.length === 0} />
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */

function TaxonomyManager({
    kind,
    entries,
    editId,
    allEmpty,
}: {
    kind: TaxonomyKind;
    entries: TaxonomyEntry[];
    editId?: string;
    allEmpty: boolean;
}) {
    const noun = kindLabel(kind).toLowerCase();
    const editing = editId ? entries.find((e) => e.id === editId) : undefined;

    const columns: Column<TaxonomyEntry>[] = [
        {
            key: "name",
            header: "Name",
            width: "w-[46%] max-w-0",
            cell: (e) => <CellStack primary={e.name} secondary={e.description || undefined} />,
        },
        {
            key: "status",
            header: "Status",
            cell: (e) => <StatusBadge status={e.active ? "active" : "inactive"} size="sm" />,
        },
        ...(kind === "super"
            ? [{
                key: "fields",
                header: "Fields",
                align: "right" as const,
                cell: (e: TaxonomyEntry) => e.fields.length || "—",
            }]
            : []),
        {
            key: "checklist",
            header: "Checklist",
            align: "right",
            cell: (e) => e.checklist.length || "—",
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (e) => (
                <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin?tab=${kind}&edit=${e.id}`} className={buttonClass("ghost", "sm")}>
                        Edit
                    </Link>
                    {/* Only the three fields the toggle needs. upsertTaxonomyAction
                        applies just the keys present, so the name and field set are
                        left alone rather than being blanked by an absent input. */}
                    <form action={upsertTaxonomyAction}>
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="active" value={e.active ? "false" : "true"} />
                        {e.active ? (
                            <ConfirmSubmit
                                title={`Deactivate "${e.name}"?`}
                                description={`It will stop appearing when organizers create an event. Events already using "${e.name}" are unaffected and keep showing it.`}
                                confirmLabel="Deactivate"
                                className={buttonClass("destructive", "sm")}
                            >
                                Deactivate
                            </ConfirmSubmit>
                        ) : (
                            <button type="submit" className={buttonClass("secondary", "sm")}>
                                Reactivate
                            </button>
                        )}
                    </form>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-8">
            {allEmpty ? (
                <Card tone="raised">
                    <CardBody>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="font-display text-base text-ink">Start from the standard list</h2>
                                <p className="mt-1 text-sm text-ink-soft">
                                    Adds nine super categories and ten event formats, with starter checklists and the
                                    category-specific fields. Everything stays editable afterwards.
                                </p>
                            </div>
                            <form action={seedTaxonomyAction}>
                                <input type="hidden" name="kind" value={kind} />
                                <button type="submit" className={buttonClass("primary", "md")}>
                                    <Sparkles size={16} aria-hidden="true" />
                                    Seed defaults
                                </button>
                            </form>
                        </div>
                    </CardBody>
                </Card>
            ) : null}

            {editing ? (
                <Card title={`Edit ${editing.name}`} action={<Link href={`/admin?tab=${kind}`} className="text-ink-soft hover:text-ink hover:underline">Cancel</Link>}>
                    <CardBody>
                        <form action={upsertTaxonomyAction} className="flex flex-col gap-5">
                            <input type="hidden" name="kind" value={kind} />
                            <input type="hidden" name="id" value={editing.id} />

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="edit-name" className={labelClass}>Name</label>
                                    <input id="edit-name" name="name" defaultValue={editing.name} required maxLength={60} className={fieldClass} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="edit-description" className={labelClass}>Description</label>
                                    <input id="edit-description" name="description" defaultValue={editing.description} maxLength={160} className={fieldClass} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="edit-checklist" className={labelClass}>Checklist template</label>
                                <textarea id="edit-checklist" name="checklist" rows={5} defaultValue={editing.checklist.join("\n")} className={`${fieldClass} resize-none`} />
                                <p className="text-xs text-ink-soft">
                                    One task per line. Loaded onto every new {noun === "event format" ? "event using this format" : "event in this category"};
                                    a category&apos;s items are added to the format&apos;s.
                                </p>
                            </div>

                            {kind === "super" ? (
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="edit-fields" className={labelClass}>Extra event fields</label>
                                    <textarea id="edit-fields" name="fields" rows={5} defaultValue={formatFieldLines(editing.fields)} className={`${fieldClass} resize-none font-mono text-xs`} />
                                    <p className="text-xs text-ink-soft">{FIELD_SYNTAX_HINT}</p>
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2 border-t border-line pt-5">
                                <Link href={`/admin?tab=${kind}`} className={buttonClass("secondary")}>Cancel</Link>
                                <button type="submit" className={buttonClass("primary")}>Save changes</button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            ) : (
                <Card title={`Add a ${noun}`}>
                    <CardBody>
                        <form action={upsertTaxonomyAction} className="flex flex-wrap items-end gap-3">
                            <input type="hidden" name="kind" value={kind} />
                            <input type="hidden" name="id" value="" />
                            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                                <label htmlFor="add-name" className={labelClass}>Name</label>
                                <input id="add-name" name="name" required maxLength={60} placeholder={kind === "super" ? "Agriculture" : "Panel Discussion"} className={fieldClass} />
                            </div>
                            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                                <label htmlFor="add-description" className={labelClass}>Description</label>
                                <input id="add-description" name="description" maxLength={160} placeholder="Shown under the name in the dropdown" className={fieldClass} />
                            </div>
                            <button type="submit" className={buttonClass("primary")}>
                                <Plus size={16} aria-hidden="true" />
                                Add
                            </button>
                        </form>
                    </CardBody>
                </Card>
            )}

            <Card>
                <DataTable
                    caption={kind === "super" ? "Super categories" : "Event formats"}
                    rows={entries}
                    columns={columns}
                    getKey={(e) => e.id}
                    empty={
                        <div className="p-6">
                            <EmptyState
                                icon={<FolderTree size={28} />}
                                title={`No ${noun}s yet`}
                                description={`Add one above, or seed the standard list to get started.`}
                            />
                        </div>
                    }
                />
            </Card>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function RequestsQueue({ requests }: { requests: TaxonomyEntry[] }) {
    if (!requests.length) {
        return (
            <Card>
                <div className="p-6">
                    <EmptyState
                        icon={<ListChecks size={28} />}
                        title="No requests"
                        description="When an organizer asks for a category that does not exist yet, it lands here for you to approve or reject."
                    />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {requests.map((r) => (
                <Card key={`${r.kind}-${r.id}`} tone={r.status === "pending" ? "raised" : "flat"}>
                    <CardBody>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-display text-base text-ink">{r.name}</h2>
                                    <StatusBadge status={r.status} size="sm" />
                                </div>
                                <p className="mt-1 text-sm text-ink-soft">
                                    {kindLabel(r.kind)} · requested by {r.requestedByName || "an organizer"}
                                </p>
                                {r.adminNote ? <p className="mt-2 text-sm text-ink">Note: {r.adminNote}</p> : null}
                            </div>

                            {r.status === "pending" ? (
                                // One form, two submit buttons. A submit button's
                                // name/value is included in the FormData, so approve
                                // and reject share the note field without any JS.
                                <form action={decideRequestAction} className="flex flex-wrap items-end gap-2">
                                    <input type="hidden" name="kind" value={r.kind} />
                                    <input type="hidden" name="id" value={r.id} />
                                    <div className="flex min-w-56 flex-col gap-1.5">
                                        <label htmlFor={`note-${r.kind}-${r.id}`} className={labelClass}>Note (optional)</label>
                                        <input id={`note-${r.kind}-${r.id}`} name="adminNote" maxLength={200} placeholder="Shown to the organizer" className={fieldClass} />
                                    </div>
                                    <button type="submit" name="decision" value="approve" className={buttonClass("primary")}>Approve</button>
                                    <ConfirmSubmit
                                        name="decision"
                                        value="reject"
                                        title={`Reject "${r.name}"?`}
                                        description="The organizer is notified and the name cannot be requested again. Your note is included."
                                        confirmLabel="Reject request"
                                        className={buttonClass("destructive")}
                                    >
                                        Reject
                                    </ConfirmSubmit>
                                </form>
                            ) : null}
                        </div>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
}
