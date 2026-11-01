"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { MODULE_LABELS, type ModuleKey } from "@/src/features/permissions/moduleKeys";
import { createClubAccount } from "@/src/features/teams/actions/department.action";
import { setClubModuleAccess } from "@/src/features/department/actions/departmentOrg.action";
import { startTenure } from "@/src/features/department/actions/tenure.action";
import { TwoStepModal } from "./TwoStepModal";
import type { ClubOverview } from "@/src/features/department/department.service";

type ModuleOption = { value: ModuleKey; label: string };

export function ClubsWorkspace({
  departmentId,
  clubs,
  moduleOptions,
}: {
  departmentId: string;
  clubs: ClubOverview[];
  moduleOptions: ModuleOption[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [tenureOpen, setTenureOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [presidentName, setPresidentName] = useState("");
  const [email, setEmail] = useState("");
  const [createModules, setCreateModules] = useState<string[]>(["events_dashboard"]);

  const [accessClubId, setAccessClubId] = useState(clubs[0]?.id ?? "");
  const [applyAll, setApplyAll] = useState(false);
  const [accessModules, setAccessModules] = useState<string[]>([]);

  const [tenureClubId, setTenureClubId] = useState(clubs[0]?.id ?? "");
  const [tenureLabel, setTenureLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [copyRoster, setCopyRoster] = useState(true);

  const selectedClub = useMemo(
    () => clubs.find((c) => c.id === accessClubId) || null,
    [clubs, accessClubId],
  );

  const openAccess = () => {
    const club = clubs.find((c) => c.id === accessClubId) || clubs[0];
    if (club) {
      setAccessClubId(club.id);
      setAccessModules([...club.modules]);
    }
    setAccessOpen(true);
  };

  const toggleModule = (list: string[], key: string, on: boolean) =>
    on ? [...new Set([...list, key])] : list.filter((k) => k !== key);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass()} onClick={() => setAddOpen(true)}>
          Add club + President
        </button>
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={openAccess}
          disabled={!clubs.length}
        >
          Grant / revoke access
        </button>
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => setTenureOpen(true)}
          disabled={!clubs.length}
        >
          Add tenure
        </button>
        <Link href="/department/tenures" className={buttonClass("ghost", "sm")}>
          Tenure overview
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {clubs.length === 0 ? (
          <p className="text-sm text-ink-soft">No clubs yet. Add a club and invite a president.</p>
        ) : (
          clubs.map((club) => (
            <Link
              key={club.id}
              href={`/department/clubs/${club.id}`}
              className="flex gap-4 rounded-xl border border-line bg-paper p-4 transition hover:border-ink/20"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-lg font-semibold text-ink">
                {club.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={club.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (club.name[0] || "?").toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base text-ink">{club.name}</h3>
                  <StatusBadge status={club.status} size="sm" />
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {club.presidentName || "President"} · {club.presidentEmail || "no email"}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Tenure: {club.currentTenureLabel || "none"} · {club.eventCount} events
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <TwoStepModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add club + President"
        description="Creates the club and emails an invite link (never a password)."
        formId="add-club-form"
        confirmLabel="Create and send invite"
        canProceed={!!name && !!presidentName && !!email}
        step1={
          <form id="add-club-form" action={createClubAccount} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="departmentId" value={departmentId} />
            <input type="hidden" name="returnTo" value="/department/clubs" />
            {createModules.map((m) => (
              <input key={m} type="hidden" name="modules" value={m} />
            ))}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="club-name">
                Club name
              </label>
              <input
                id="club-name"
                name="name"
                required
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="club-desc">
                Description
              </label>
              <textarea
                id="club-desc"
                name="description"
                rows={2}
                className={fieldClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="club-logo">
                Logo URL (optional)
              </label>
              <input
                id="club-logo"
                name="logoUrl"
                className={fieldClass}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="pres-name">
                President name
              </label>
              <input
                id="pres-name"
                name="presidentName"
                required
                className={fieldClass}
                value={presidentName}
                onChange={(e) => setPresidentName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="pres-email">
                President email
              </label>
              <input
                id="pres-email"
                name="email"
                type="email"
                required
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <fieldset className="sm:col-span-2 space-y-2">
              <legend className="text-xs font-medium text-ink">Initial features</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {moduleOptions.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={createModules.includes(o.value)}
                      onChange={(e) =>
                        setCreateModules(toggleModule(createModules, o.value, e.target.checked))
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </form>
        }
        preview={
          <>
            <p>
              <strong>{name || "—"}</strong>
              {description ? ` — ${description}` : ""}
            </p>
            <p>
              President: {presidentName} ({email})
            </p>
            <p>
              Features:{" "}
              {createModules.length
                ? createModules.map((k) => MODULE_LABELS[k as ModuleKey] ?? k).join(", ")
                : "none"}
            </p>
            <p className="text-ink-soft">An invite link will be emailed. No password is sent.</p>
          </>
        }
      />

      <TwoStepModal
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        title="Grant / revoke access"
        description="Writes org_module_access. Revoking removes access immediately."
        formId="access-form"
        confirmLabel="Save access"
        canProceed={applyAll || !!accessClubId}
        step1={
          <form id="access-form" action={setClubModuleAccess} className="space-y-3">
            <input type="hidden" name="departmentId" value={departmentId} />
            <input type="hidden" name="returnTo" value="/department/clubs" />
            {applyAll ? <input type="hidden" name="applyAll" value="true" /> : null}
            {!applyAll ? <input type="hidden" name="orgId" value={accessClubId} /> : null}
            {accessModules.map((m) => (
              <input key={m} type="hidden" name="modules" value={m} />
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyAll}
                onChange={(e) => setApplyAll(e.target.checked)}
              />
              Apply to every club
            </label>
            {!applyAll ? (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="access-club">
                  Club
                </label>
                <select
                  id="access-club"
                  className={fieldClass}
                  value={accessClubId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAccessClubId(id);
                    const club = clubs.find((c) => c.id === id);
                    setAccessModules(club ? [...club.modules] : []);
                  }}
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {selectedClub && !applyAll ? (
              <p className="text-xs text-ink-soft">
                Current:{" "}
                {selectedClub.modules.length
                  ? selectedClub.modules.map((k) => MODULE_LABELS[k]).join(", ")
                  : "none"}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {moduleOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={accessModules.includes(o.value)}
                    onChange={(e) =>
                      setAccessModules(toggleModule(accessModules, o.value, e.target.checked))
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </form>
        }
        preview={
          <>
            <p>Target: {applyAll ? "All clubs" : selectedClub?.name || "—"}</p>
            <p>
              Granted modules:{" "}
              {accessModules.length
                ? accessModules.map((k) => MODULE_LABELS[k as ModuleKey] ?? k).join(", ")
                : "none (full revoke)"}
            </p>
          </>
        }
      />

      <TwoStepModal
        open={tenureOpen}
        onClose={() => setTenureOpen(false)}
        title="Start new tenure"
        description="Closes the current tenure and opens a new current term for the club."
        formId="tenure-form"
        confirmLabel="Start tenure"
        canProceed={!!tenureClubId && !!tenureLabel && !!startDate && !!endDate}
        step1={
          <form id="tenure-form" action={startTenure} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="departmentId" value={departmentId} />
            <input type="hidden" name="returnTo" value="/department/clubs" />
            <input type="hidden" name="clubId" value={tenureClubId} />
            {copyRoster ? <input type="hidden" name="copyRoster" value="true" /> : null}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="tenure-club">
                Club
              </label>
              <select
                id="tenure-club"
                className={fieldClass}
                value={tenureClubId}
                onChange={(e) => setTenureClubId(e.target.value)}
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.currentTenureLabel ? ` (current: ${c.currentTenureLabel})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass} htmlFor="tenure-label">
                Label
              </label>
              <input
                id="tenure-label"
                name="label"
                required
                className={fieldClass}
                placeholder="2025-2026"
                value={tenureLabel}
                onChange={(e) => setTenureLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="tenure-start">
                Start
              </label>
              <input
                id="tenure-start"
                name="startDate"
                type="date"
                required
                className={fieldClass}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="tenure-end">
                End
              </label>
              <input
                id="tenure-end"
                name="endDate"
                type="date"
                required
                className={fieldClass}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={copyRoster}
                onChange={(e) => setCopyRoster(e.target.checked)}
              />
              Copy previous committee roster as a draft
            </label>
          </form>
        }
        preview={
          <>
            <p>Club: {clubs.find((c) => c.id === tenureClubId)?.name || "—"}</p>
            <p>
              {tenureLabel}: {startDate} → {endDate}
            </p>
            <p>
              {copyRoster
                ? "Will copy committee roster as draft."
                : "Empty committee for the new tenure."}
            </p>
          </>
        }
      />
    </div>
  );
}
