"use client";

import { useState, useTransition } from "react";
import type { RecruitmentFormDoc, TeamWithMembers, TeamPositionDoc } from "../teamEngine.types";
import type { TeamsScope } from "./TeamsManager";
import { exportTeamsAction } from "../actions/exportTeams.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { Modal } from "@/src/components/ui/Modal";

const MEMBER_COLUMNS: { key: string; label: string }[] = [
  { key: "teamName", label: "Team" },
  { key: "lead", label: "Lead" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "position", label: "Position" },
  { key: "access", label: "Access" },
  { key: "source", label: "Source" },
  { key: "joined", label: "Joined" },
];

const APPLICANT_COLUMNS: { key: string; label: string }[] = [
  { key: "formTitle", label: "Form" },
  { key: "teamName", label: "Team" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "appliedAt", label: "Applied" },
  { key: "position", label: "Position" },
];

export function ExportTeamsModal({
  teams,
  scope,
  forms = [],
  onClose,
}: {
  teams: TeamWithMembers[];
  positionsByMember?: Map<string, TeamPositionDoc>;
  scope: TeamsScope;
  forms?: RecruitmentFormDoc[];
  onClose: () => void;
}) {
  const [scopeMode, setScopeMode] = useState<"all" | "selected" | "form">("all");
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(teams.map((t) => [t.id, true])),
  );
  const [formId, setFormId] = useState(forms[0]?.id || "");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [columns, setColumns] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MEMBER_COLUMNS.map((c) => [c.key, true])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const columnDefs = scopeMode === "form" ? APPLICANT_COLUMNS : MEMBER_COLUMNS;

  function download() {
    setError(null);
    const teamIds =
      scopeMode === "all"
        ? teams.map((t) => t.id)
        : scopeMode === "selected"
          ? teams.filter((t) => picked[t.id]).map((t) => t.id)
          : [];
    if (scopeMode !== "form" && !teamIds.length) {
      setError("Select at least one team.");
      return;
    }
    if (scopeMode === "form" && !formId) {
      setError("Select a recruitment form.");
      return;
    }
    const selectedCols = columnDefs.filter((c) => columns[c.key]).map((c) => c.key);
    if (!selectedCols.length) {
      setError("Pick at least one column.");
      return;
    }
    start(async () => {
      const result = await exportTeamsAction({
        teamIds: scopeMode === "form" ? undefined : teamIds,
        formId: scopeMode === "form" ? formId : undefined,
        scope: scopeMode,
        columns: selectedCols,
        format,
        organizerId:
          scope.kind === "organizer" || scope.kind === "event" ? scope.organizerId : undefined,
        eventId: scope.kind === "event" ? scope.eventId : undefined,
        orgId:
          scope.kind === "club" || scope.kind === "department" || scope.kind === "platform"
            ? scope.orgId
            : undefined,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const a = document.createElement("a");
      a.href = result.data.url;
      a.download = result.data.filename;
      a.click();
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Export teams"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass("ghost", "sm")} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            disabled={pending}
            onClick={download}
          >
            {pending ? "Exporting…" : `Download ${format}`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className={labelClass}>Scope</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scopeMode === "all"}
              onChange={() => setScopeMode("all")}
            />
            All teams
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scopeMode === "selected"}
              onChange={() => setScopeMode("selected")}
            />
            Selected teams
          </label>
          {forms.length ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scopeMode === "form"}
                onChange={() => {
                  setScopeMode("form");
                  setColumns(Object.fromEntries(APPLICANT_COLUMNS.map((c) => [c.key, true])));
                }}
              />
              One form&apos;s applicants
            </label>
          ) : null}
        </fieldset>

        {scopeMode === "selected" ? (
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-line p-3">
            {teams.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!picked[t.id]}
                  onChange={(e) => setPicked((s) => ({ ...s, [t.id]: e.target.checked }))}
                />
                {t.name}
              </label>
            ))}
          </div>
        ) : null}

        {scopeMode === "form" ? (
          <div>
            <label className={labelClass} htmlFor="export-form">
              Form
            </label>
            <select
              id="export-form"
              className={fieldClass}
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <fieldset className="space-y-2">
          <legend className={labelClass}>Format</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={format === "xlsx"} onChange={() => setFormat("xlsx")} />
            Excel (.xlsx)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={format === "csv"} onChange={() => setFormat("csv")} />
            CSV
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={labelClass}>Columns</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {columnDefs.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!columns[c.key]}
                  onChange={(e) => setColumns((s) => ({ ...s, [c.key]: e.target.checked }))}
                />
                {c.label}
              </label>
            ))}
          </div>
          {scopeMode !== "form" ? (
            <p className="text-xs text-ink-soft">Lead is included on every member row.</p>
          ) : null}
        </fieldset>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </Modal>
  );
}
