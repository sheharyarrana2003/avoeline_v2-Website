"use client";

import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Info,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { deleteOrg, updateOrg } from "@/src/features/admin/actions/tenancy.action";
import type {
  OrgListClub,
  OrgListDepartment,
  OrgListMetrics,
  OrgListPlanOption,
} from "@/src/features/admin/orgList.service";
import { accountIsLive } from "@/src/features/admin/types";
import { Card } from "@/src/shared_components/ui/Card";
import { CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { ClientDataTable } from "@/src/shared_components/ui/ClientDataTable";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass, fieldClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";

type Tab = "hierarchy" | "departments" | "clubs";
type StatusFilter = "all" | "active" | "suspended";

export type OrgBoardProps = {
  departments: OrgListDepartment[];
  clubs: OrgListClub[];
  metrics: OrgListMetrics;
  plans?: OrgListPlanOption[];
  canDelete?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function OrgAvatar({ name, logoUrl }: { name: string; logoUrl: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-xl object-cover" />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-ink-soft">
      {initials(name)}
    </div>
  );
}

function matchesQuery(q: string, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  return fields.some((f) => (f || "").toLowerCase().includes(q));
}

function statusMatches(filter: StatusFilter, accountStatus: string) {
  if (filter === "all") return true;
  if (filter === "active") return accountIsLive(accountStatus);
  return !accountIsLive(accountStatus);
}

function ActionsMenu({
  openHref,
  onQuickEdit,
  onDelete,
  canDelete,
}: {
  openHref: string;
  onQuickEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={buttonClass("ghost", "sm")}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">⋯</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-xl border border-line bg-paper py-1 shadow-lg">
          <Link
            href={openHref}
            className="block px-3 py-2 text-sm text-ink hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Open
          </Link>
          {onQuickEdit ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onQuickEdit();
              }}
            >
              Quick edit
            </button>
          ) : null}
          {canDelete && onDelete ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function OrgBoard({
  departments: initialDepts,
  clubs: initialClubs,
  metrics,
  plans = [],
  canDelete = false,
}: OrgBoardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hierarchy");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<OrgListDepartment | null>(null);
  const [deleting, setDeleting] = useState<{
    id: string;
    name: string;
    clubsCount: number;
    eventsCount: number;
    loginsCount: number;
  } | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");

  const q = query.trim().toLowerCase();

  const filteredDepts = useMemo(() => {
    return initialDepts.filter((d) => {
      if (!statusMatches(statusFilter, d.accountStatus)) return false;
      if (planFilter && d.planKey !== planFilter) return false;
      return matchesQuery(q, d.name, d.adminEmail, d.contactEmail);
    });
  }, [initialDepts, statusFilter, planFilter, q]);

  const filteredClubs = useMemo(() => {
    return initialClubs.filter((c) => {
      if (!statusMatches(statusFilter, c.accountStatus)) return false;
      if (planFilter) {
        const parent = initialDepts.find((d) => d.id === c.parentOrgId);
        if (!parent || parent.planKey !== planFilter) return false;
      }
      return matchesQuery(q, c.name, c.presidentEmail, c.presidentName, c.parentName);
    });
  }, [initialClubs, initialDepts, statusFilter, planFilter, q]);

  const clubsForDept = (deptId: string) => filteredClubs.filter((c) => c.parentOrgId === deptId);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDelete = (dept: OrgListDepartment) => {
    setConfirmTyped("");
    setDeleting({
      id: dept.id,
      name: dept.name,
      clubsCount: dept.clubsCount,
      eventsCount: dept.eventsCount,
      loginsCount: dept.loginsCount,
    });
  };

  const tabClass = (t: Tab) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      tab === t ? "bg-ink text-ink-invert" : "text-ink-soft hover:bg-muted hover:text-ink"
    }`;

  const deptColumns: Column<OrgListDepartment>[] = [
    {
      key: "name",
      header: "Name",
      width: "w-[28%] max-w-0",
      cell: (d) => <CellStack primary={d.name} secondary={d.adminEmail || undefined} />,
    },
    {
      key: "plan",
      header: "Plan",
      cell: (d) => d.planName || "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => <StatusBadge status={d.accountStatus} size="sm" marker="dot" />,
    },
    {
      key: "clubs",
      header: "Clubs",
      align: "right",
      cell: (d) => d.clubsCount,
    },
    {
      key: "events",
      header: "Events",
      align: "right",
      cell: (d) => d.eventsCount,
    },
    {
      key: "admin",
      header: "Admin email",
      cell: (d) => d.adminEmail || "—",
    },
    {
      key: "created",
      header: "Created",
      cell: (d) => (d.createdAt ? formatDateMedium(d.createdAt) : "—"),
    },
  ];

  const clubColumns: Column<OrgListClub>[] = [
    {
      key: "club",
      header: "Club",
      width: "w-[24%] max-w-0",
      cell: (c) => <CellStack primary={c.name} secondary={c.presidentEmail || undefined} />,
    },
    {
      key: "parent",
      header: "Parent",
      cell: (c) => c.parentName,
    },
    {
      key: "president",
      header: "President",
      cell: (c) => c.presidentName || c.presidentEmail || "—",
    },
    {
      key: "tenure",
      header: "Tenure",
      cell: (c) => c.currentTenureLabel || "—",
    },
    {
      key: "events",
      header: "Events",
      align: "right",
      cell: (c) => c.eventsCount,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} size="sm" marker="dot" />,
    },
  ];

  const noOrgs = initialDepts.length === 0 && initialClubs.length === 0;
  const noResults =
    !noOrgs &&
    ((tab === "departments" && filteredDepts.length === 0) ||
      (tab === "clubs" && filteredClubs.length === 0) ||
      (tab === "hierarchy" && filteredDepts.length === 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Departments & clubs</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
            University tree — browse and edit folders; create logins under Tenant accounts.
            <span
              title="No Add on this page. Create department logins under Tenant accounts. Clubs are added by departments. Delete (owner only) removes the folder and related Auth logins."
              className="inline-flex text-ink-faint"
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">More about this page</span>
            </span>
          </p>
        </div>
        <Link href="/admin/tenants" className={buttonClass("primary", "sm")}>
          Tenant accounts
        </Link>
      </div>

      <section className="grid grid-cols-2 border-y border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
        <MetricTile label="Departments" value={`${metrics.departmentsCount}`} size="md" />
        <MetricTile label="Clubs" value={`${metrics.clubsCount}`} size="md" />
        <MetricTile label="Active" value={`${metrics.activeCount}`} size="md" />
        <MetricTile label="Suspended" value={`${metrics.suspendedCount}`} size="md" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className={`${fieldClass} pl-9`}
            aria-label="Search name or email"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            All
          </FilterChip>
          <FilterChip active={statusFilter === "active"} onClick={() => setStatusFilter("active")}>
            Active
          </FilterChip>
          <FilterChip
            active={statusFilter === "suspended"}
            onClick={() => setStatusFilter("suspended")}
          >
            Suspended
          </FilterChip>
        </div>
        {plans.length > 0 ? (
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className={`${fieldClass} w-auto sm:max-w-[12rem]`}
            aria-label="Filter by plan"
          >
            <option value="">All plans</option>
            {plans.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex gap-2 border-b border-line pb-3">
        <button type="button" onClick={() => setTab("hierarchy")} className={tabClass("hierarchy")}>
          Hierarchy
        </button>
        <button
          type="button"
          onClick={() => setTab("departments")}
          className={tabClass("departments")}
        >
          Departments ({filteredDepts.length})
        </button>
        <button type="button" onClick={() => setTab("clubs")} className={tabClass("clubs")}>
          Clubs ({filteredClubs.length})
        </button>
      </div>

      {noOrgs ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No departments yet"
          description="Create logins under Tenant accounts. Clubs are added by departments once those accounts exist."
          action={
            <Link href="/admin/tenants" className={buttonClass("secondary", "sm")}>
              Go to Tenant accounts
            </Link>
          }
        />
      ) : null}

      {!noOrgs && noResults ? (
        <EmptyState
          size="sm"
          title="No results"
          description="Try a different search, status, or plan filter."
        />
      ) : null}

      {!noOrgs && !noResults && tab === "hierarchy" ? (
        <div className="space-y-3">
          {filteredDepts.map((dept) => {
            const open = expanded.has(dept.id);
            const nested = clubsForDept(dept.id);
            return (
              <Card key={dept.id} tone="raised">
                <div>
                  <div className="flex items-start gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(dept.id)}
                      className="mt-1 rounded-md p-0.5 text-ink-soft hover:bg-muted hover:text-ink"
                      aria-expanded={open}
                      aria-label={open ? "Collapse clubs" : "Expand clubs"}
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <OrgAvatar name={dept.name} logoUrl={dept.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-ink">
                          {dept.name}
                        </h3>
                        <StatusBadge status="pending" label="Department" size="sm" marker="dot" />
                        {dept.planName ? (
                          <span className="rounded-full border border-line bg-muted px-2 py-0.5 text-2xs font-semibold uppercase text-ink-soft">
                            {dept.planName}
                          </span>
                        ) : null}
                        <StatusBadge status={dept.accountStatus} size="sm" marker="dot" />
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        {dept.clubsCount} {dept.clubsCount === 1 ? "club" : "clubs"} ·{" "}
                        {dept.eventsCount} {dept.eventsCount === 1 ? "event" : "events"}
                        {dept.adminEmail ? ` · ${dept.adminEmail}` : ""}
                      </p>
                    </div>
                    <ActionsMenu
                      openHref={`/admin/departments/${dept.id}`}
                      onQuickEdit={dept.ownerUserId ? () => setEditing(dept) : undefined}
                      canDelete={canDelete}
                      onDelete={canDelete ? () => openDelete(dept) : undefined}
                    />
                  </div>
                  {open ? (
                    <div className="border-t border-line bg-canvas/50 px-4 py-3">
                      {nested.length === 0 ? (
                        <p className="pl-8 text-xs italic text-ink-faint">
                          No clubs under this department yet.
                        </p>
                      ) : (
                        <ul className="space-y-2 pl-2 sm:pl-8">
                          {nested.map((club) => (
                            <li key={club.id}>
                              <Link
                                href={`/admin/clubs/${club.id}`}
                                className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5 transition hover:border-line-loud"
                              >
                                <OrgAvatar name={club.name} logoUrl={club.logoUrl} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-ink">{club.name}</span>
                                    <StatusBadge status={club.status} size="sm" marker="dot" />
                                  </div>
                                  <p className="mt-0.5 text-xs text-ink-soft">
                                    {[
                                      club.presidentName || club.presidentEmail,
                                      club.currentTenureLabel,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || "No president yet"}
                                    {` · ${club.eventsCount} ${club.eventsCount === 1 ? "event" : "events"}`}
                                  </p>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {!noOrgs && !noResults && tab === "departments" ? (
        <Card>
          <ClientDataTable
            caption="Departments"
            rows={filteredDepts}
            columns={deptColumns}
            getKey={(r) => r.id}
            onRowClick={(r) => router.push(`/admin/departments/${r.id}`)}
            empty={
              <EmptyState
                size="sm"
                title="No departments match"
                description="Clear filters to see all."
              />
            }
          />
        </Card>
      ) : null}

      {!noOrgs && !noResults && tab === "clubs" ? (
        <Card>
          <ClientDataTable
            caption="Clubs"
            rows={filteredClubs}
            columns={clubColumns}
            getKey={(r) => r.id}
            onRowClick={(r) => router.push(`/admin/clubs/${r.id}`)}
            empty={
              <EmptyState
                size="sm"
                title="No clubs match"
                description="Clear filters to see all."
              />
            }
          />
        </Card>
      ) : null}

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
            <h3 className="font-display text-lg font-bold text-ink">Quick edit department</h3>
            <p className="mt-1 text-xs text-ink-soft">Name and plan only.</p>
            <form action={updateOrg} className="mt-5 space-y-4">
              <input type="hidden" name="orgId" value={editing.id} />
              <label className="block text-xs font-semibold text-ink">
                Name
                <input
                  name="name"
                  defaultValue={editing.name}
                  required
                  className={`mt-1.5 ${fieldClass}`}
                />
              </label>
              {plans.length > 0 ? (
                <label className="block text-xs font-semibold text-ink">
                  Plan
                  <select
                    name="planKey"
                    defaultValue={editing.planKey || ""}
                    className={`mt-1.5 ${fieldClass}`}
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
                  className={buttonClass("secondary", "sm")}
                >
                  Cancel
                </button>
                <button type="submit" className={buttonClass("primary", "sm")}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-lg font-bold text-ink">Delete {deleting.name}?</h3>
            <p className="mt-2 text-sm text-ink-soft">
              This removes the folder
              {deleting.clubsCount
                ? `, ${deleting.clubsCount} ${deleting.clubsCount === 1 ? "club" : "clubs"}`
                : ""}
              {deleting.eventsCount
                ? `, ${deleting.eventsCount} ${deleting.eventsCount === 1 ? "event" : "events"}`
                : ""}
              {deleting.loginsCount
                ? `, and about ${deleting.loginsCount} related ${deleting.loginsCount === 1 ? "login" : "logins"}`
                : ""}
              .
            </p>
            <form action={deleteOrg} className="mt-5 space-y-4">
              <input type="hidden" name="orgId" value={deleting.id} />
              <input type="hidden" name="confirmName" value={confirmTyped} />
              <label className="block text-xs font-semibold text-ink">
                Type <span className="font-mono text-ink">{deleting.name}</span> to confirm
                <input
                  value={confirmTyped}
                  onChange={(e) => setConfirmTyped(e.target.value)}
                  autoComplete="off"
                  className={`mt-1.5 ${fieldClass}`}
                  required
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className={buttonClass("secondary", "sm")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmTyped !== deleting.name}
                  className={buttonClass("destructive", "sm")}
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer OrgBoard — kept for any stale imports. */
export { OrgBoard as OrgManagementView };
