"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ClientDataTable } from "@/src/shared_components/ui/ClientDataTable";
import { FormBuilder } from "@/src/features/events/components/wizard/FormBuilder";
import { CustomFieldsRenderer } from "@/src/features/events/components/CustomFieldsRenderer";
import type { CustomField } from "@/src/services/models/event.model";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { CopyShareLink } from "./CopyShareLink";
import {
  APPLICANT_STATUS_LABEL,
  APPLICANT_STATUSES,
  type RecruitmentFormDoc,
  type StaffApplicant,
  type TeamPositionDoc,
  type TeamWithMembers,
} from "../teamEngine.types";
import {
  deleteOrganizerRecruitmentFormAction,
  duplicateOrganizerRecruitmentFormAction,
  saveOrganizerApplicantNotesAction,
  saveOrganizerRecruitmentFormAction,
  setOrganizerApplicantStatusAction,
  setOrganizerRecruitmentFormOpenAction,
} from "../actions/organizerRecruitment.action";

function applicantName(a: StaffApplicant): string {
  return String(a.responses.name || a.email || "Applicant");
}

function toCustomFields(form: RecruitmentFormDoc | null): CustomField[] {
  if (!form?.fields?.length) {
    return [
      {
        id: "why",
        label: "Why do you want this role?",
        type: "long_text",
        required: true,
        options: [],
      },
    ];
  }
  return form.fields.map((f) => ({
    id: f.id || f.key,
    label: f.label,
    type:
      f.type === "select"
        ? "dropdown"
        : f.type === "checkbox"
          ? "checkboxes"
          : (f.type as CustomField["type"]),
    options: f.options,
    required: !!f.required,
  }));
}

function persistFields(fields: CustomField[]) {
  return fields.map((f) => ({
    key: f.id,
    id: f.id,
    label: f.label,
    type: f.type === "dropdown" ? "select" : f.type === "checkboxes" ? "checkbox" : f.type,
    options: f.options,
    required: f.required,
  }));
}

export function OrganizerRecruitmentTab({
  organizerId,
  teams,
  forms,
  applicants,
  positionsByTeam,
  applyOrigin,
}: {
  organizerId: string;
  teams: TeamWithMembers[];
  forms: RecruitmentFormDoc[];
  applicants: StaffApplicant[];
  positionsByTeam: Record<string, TeamPositionDoc[]>;
  applyOrigin: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [formModal, setFormModal] = useState<RecruitmentFormDoc | "new" | null>(null);
  const [previewForm, setPreviewForm] = useState<RecruitmentFormDoc | null>(null);
  const [drawer, setDrawer] = useState<StaffApplicant | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecruitmentFormDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);
  const positionTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const list of Object.values(positionsByTeam)) {
      for (const p of list) m.set(p.id, p.title);
    }
    return m;
  }, [positionsByTeam]);

  const countsByForm = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of applicants) {
      if (a.status === "withdrawn") continue;
      m.set(a.formId, (m.get(a.formId) ?? 0) + 1);
    }
    return m;
  }, [applicants]);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Recruitment</h2>
          <p className="text-sm text-ink-soft">
            Library forms for your organizer teams — assign staff from each event.
          </p>
        </div>
        <button
          type="button"
          className={buttonClass("primary", "sm")}
          onClick={() => setFormModal("new")}
        >
          <Plus className="h-3.5 w-3.5" />
          New form
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {flash ? <p className="text-sm text-ink">{flash}</p> : null}

      {!forms.length ? (
        <EmptyState
          title="No recruitment forms yet"
          description="Create a form targeting a library team and position. Applicants apply via a public link."
          action={
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={() => setFormModal("new")}
            >
              New form
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
          {forms.map((f) => {
            const applyUrl = f.publicToken
              ? `${applyOrigin.replace(/\/$/, "")}/apply/${f.publicToken}`
              : "";
            return (
              <li key={f.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{f.title}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {teamName.get(f.teamId) || "Team"}
                      {f.positionId ? ` · ${positionTitle.get(f.positionId) || "Position"}` : ""}
                      {" · "}
                      {countsByForm.get(f.id) ?? 0} applicant
                      {(countsByForm.get(f.id) ?? 0) === 1 ? "" : "s"}
                      {f.closesAt ? ` · Closes ${new Date(f.closesAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={f.isOpen ? "open" : "closed"}
                    label={f.isOpen ? "Open" : "Closed"}
                    size="sm"
                  />
                </div>
                {applyUrl ? <CopyShareLink url={applyUrl} /> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={() => setFormModal(f)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    onClick={() => setPreviewForm(f)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      start(async () => {
                        const r = await duplicateOrganizerRecruitmentFormAction({
                          organizerId,
                          formId: f.id,
                        });
                        if (!r.ok) setError(r.error.message);
                        else {
                          setFlash("Form duplicated (closed).");
                          refresh();
                        }
                      });
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      start(async () => {
                        const r = await setOrganizerRecruitmentFormOpenAction({
                          organizerId,
                          formId: f.id,
                          isOpen: !f.isOpen,
                        });
                        if (!r.ok) setError(r.error.message);
                        else refresh();
                      });
                    }}
                  >
                    {f.isOpen ? "Close" : "Reopen"}
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    onClick={() => setConfirmDelete(f)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-ink">Applicants</h3>
          <div className="flex gap-1 rounded-lg border border-line p-0.5">
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs ${view === "table" ? "bg-ink text-ink-invert" : "text-ink-soft"}`}
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs ${view === "kanban" ? "bg-ink text-ink-invert" : "text-ink-soft"}`}
              onClick={() => setView("kanban")}
              aria-pressed={view === "kanban"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!applicants.length ? (
          <EmptyState
            size="sm"
            title="No applicants yet"
            description="Share a form link to start receiving applications."
          />
        ) : view === "table" ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            <ClientDataTable
              rows={applicants}
              getKey={(r) => r.id}
              caption="Applicants"
              onRowClick={(row) => setDrawer(row)}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  cell: (a) => <span className="font-medium text-ink">{applicantName(a)}</span>,
                },
                { key: "email", header: "Email", cell: (a) => a.email },
                {
                  key: "team",
                  header: "Team",
                  cell: (a) => teamName.get(a.teamId) || "—",
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (a) => (
                    <StatusBadge
                      status={a.status === "accepted" ? "approved" : a.status}
                      label={APPLICANT_STATUS_LABEL[a.status]}
                      size="sm"
                    />
                  ),
                },
                {
                  key: "applied",
                  header: "Applied",
                  cell: (a) => (a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : "—"),
                },
              ]}
            />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {APPLICANT_STATUSES.map((status) => {
              const rows = applicants.filter((a) => a.status === status);
              return (
                <div key={status} className="space-y-2 rounded-xl border border-line bg-paper p-3">
                  <p className="text-2xs font-medium uppercase text-ink-soft">
                    {APPLICANT_STATUS_LABEL[status]} · {rows.length}
                  </p>
                  {rows.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setDrawer(a)}
                      className="w-full rounded-lg border border-line px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium text-ink">{applicantName(a)}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">{a.email}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formModal ? (
        <RecruitmentFormModal
          organizerId={organizerId}
          teams={teams}
          positionsByTeam={positionsByTeam}
          initial={formModal === "new" ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            refresh();
          }}
        />
      ) : null}

      {previewForm ? (
        <Modal
          open
          onClose={() => setPreviewForm(null)}
          title={previewForm.title}
          description={previewForm.intro || "Applicant preview"}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <CustomFieldsRenderer fields={toCustomFields(previewForm)} />
          </div>
        </Modal>
      ) : null}

      {drawer ? (
        <ApplicantDrawer
          organizerId={organizerId}
          applicant={drawer}
          teamLabel={teamName.get(drawer.teamId) || ""}
          positionLabel={drawer.positionId ? positionTitle.get(drawer.positionId) || "" : ""}
          form={forms.find((f) => f.id === drawer.formId) || null}
          onClose={() => setDrawer(null)}
          onUpdated={() => {
            setDrawer(null);
            refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete recruitment form?"
        description="Applicants on this form will also be removed. This cannot be undone."
        confirmLabel="Delete form"
        tone="danger"
        busy={pending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          setError(null);
          start(async () => {
            const r = await deleteOrganizerRecruitmentFormAction({
              organizerId,
              formId: confirmDelete.id,
            });
            setConfirmDelete(null);
            if (!r.ok) setError(r.error.message);
            else refresh();
          });
        }}
      />
    </div>
  );
}

function RecruitmentFormModal({
  organizerId,
  teams,
  positionsByTeam,
  initial,
  onClose,
  onSaved,
}: {
  organizerId: string;
  teams: TeamWithMembers[];
  positionsByTeam: Record<string, TeamPositionDoc[]>;
  initial: RecruitmentFormDoc | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [teamId, setTeamId] = useState(initial?.teamId || teams[0]?.id || "");
  const [positionId, setPositionId] = useState(initial?.positionId || "");
  const [title, setTitle] = useState(initial?.title || "Staff application");
  const [intro, setIntro] = useState(initial?.intro || "");
  const [closesAt, setClosesAt] = useState(initial?.closesAt ? initial.closesAt.slice(0, 16) : "");
  const [cap, setCap] = useState(initial?.cap ? String(initial.cap) : "");
  const [isOpen, setIsOpen] = useState(initial?.isOpen ?? true);
  const [fields, setFields] = useState<CustomField[]>(() => toCustomFields(initial));
  const [showPreview, setShowPreview] = useState(false);
  const positions = positionsByTeam[teamId] ?? [];

  function save() {
    setError(null);
    start(async () => {
      const r = await saveOrganizerRecruitmentFormAction({
        organizerId,
        formId: initial?.id,
        teamId,
        positionId: positionId || null,
        title,
        intro,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        cap: cap.trim() ? Number(cap) : null,
        isOpen,
        fields: persistFields(fields),
      });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit recruitment form" : "New recruitment form"}
      description="Same FormBuilder as event staff — saved to your organizer library."
      maxWidth="2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonClass("ghost", "sm")} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Edit fields" : "Preview"}
          </button>
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            disabled={pending}
            onClick={save}
          >
            {pending ? "Saving…" : "Save form"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rf-title">
              Title
            </label>
            <input
              id="rf-title"
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-team">
              Target team
            </label>
            <select
              id="rf-team"
              className={fieldClass}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPositionId("");
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-pos">
              Position
            </label>
            <select
              id="rf-pos"
              className={fieldClass}
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            >
              <option value="">Any / unassigned</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-close">
              Closing date
            </label>
            <input
              id="rf-close"
              type="datetime-local"
              className={fieldClass}
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rf-cap">
              Applicant cap
            </label>
            <input
              id="rf-cap"
              type="number"
              min={1}
              className={fieldClass}
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink sm:mt-6">
            <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            Form is open
          </label>
        </div>
        <div>
          <label className={labelClass} htmlFor="rf-intro">
            Intro
          </label>
          <textarea
            id="rf-intro"
            className={fieldClass}
            rows={2}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </div>
        {showPreview ? (
          <div className="rounded-xl border border-dashed border-line p-4">
            <p className="mb-3 text-sm text-ink-soft">{intro || "No intro"}</p>
            <CustomFieldsRenderer fields={fields} />
          </div>
        ) : (
          <FormBuilder fields={fields} onChange={setFields} />
        )}
      </div>
    </Modal>
  );
}

function ApplicantDrawer({
  organizerId,
  applicant,
  teamLabel,
  positionLabel,
  form,
  onClose,
  onUpdated,
}: {
  organizerId: string;
  applicant: StaffApplicant;
  teamLabel: string;
  positionLabel: string;
  form: RecruitmentFormDoc | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(applicant.privateNotes || "");
  const [interviewAt, setInterviewAt] = useState("");
  const [interviewTz, setInterviewTz] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [copyable, setCopyable] = useState<string | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [grantHint, setGrantHint] = useState(false);

  function setStatus(status: StaffApplicant["status"], extras?: { grantAfterOnboard?: boolean }) {
    setError(null);
    setCopyable(null);
    setIcsUrl(null);
    start(async () => {
      const r = await setOrganizerApplicantStatusAction({
        organizerId,
        applicantId: applicant.id,
        status,
        interviewAt:
          status === "interview_scheduled" ? new Date(interviewAt).toISOString() : undefined,
        interviewTz: status === "interview_scheduled" ? interviewTz : undefined,
        interviewLink: status === "interview_scheduled" ? interviewLink : undefined,
        interviewLocation: status === "interview_scheduled" ? interviewLocation : undefined,
        interviewNotes: status === "interview_scheduled" ? interviewNotes : undefined,
        grantAfterOnboard: extras?.grantAfterOnboard,
      });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      if (r.data.copyableMessage) setCopyable(r.data.copyableMessage);
      if (r.data.icsDataUrl) setIcsUrl(r.data.icsDataUrl);
      if (r.data.needsGrant) setGrantHint(true);
      if (!r.data.copyableMessage && !r.data.needsGrant) onUpdated();
      else if (!r.data.copyableMessage) onUpdated();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" role="dialog" aria-modal>
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-paper p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">{applicantName(applicant)}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {applicant.email}
              {teamLabel ? ` · ${teamLabel}` : ""}
              {positionLabel ? ` · ${positionLabel}` : ""}
            </p>
            <div className="mt-2">
              <StatusBadge
                status={applicant.status === "accepted" ? "approved" : applicant.status}
                label={APPLICANT_STATUS_LABEL[applicant.status]}
                size="sm"
              />
            </div>
          </div>
          <button type="button" className={buttonClass("ghost", "sm")} onClick={onClose}>
            Close
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-6 space-y-2">
          <h3 className="text-2xs font-medium uppercase text-ink-soft">Answers</h3>
          <dl className="space-y-2 text-sm">
            {Object.entries(applicant.responses)
              .filter(([k]) => k !== "name")
              .map(([key, value]) => {
                const label = form?.fields.find((f) => f.key === key)?.label || key;
                return (
                  <div key={key}>
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="text-ink">
                      {Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
                    </dd>
                  </div>
                );
              })}
          </dl>
        </section>

        <section className="mt-6 space-y-2">
          <h3 className="text-2xs font-medium uppercase text-ink-soft">Timeline</h3>
          <ul className="space-y-2 text-sm">
            {(applicant.timeline.length
              ? applicant.timeline
              : [{ at: applicant.appliedAt, kind: "applied", note: "Applied" }]
            ).map((e, i) => (
              <li key={`${e.at}-${i}`} className="rounded-lg border border-line px-3 py-2">
                <span className="font-medium text-ink">{e.kind}</span>
                <span className="ml-2 text-xs text-ink-soft">
                  {e.at ? new Date(e.at).toLocaleString() : ""}
                </span>
                {e.note ? <p className="mt-1 text-ink-soft">{e.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 space-y-2">
          <label className={labelClass} htmlFor="app-notes">
            Private notes
          </label>
          <textarea
            id="app-notes"
            className={fieldClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            disabled={pending}
            onClick={() => {
              start(async () => {
                const r = await saveOrganizerApplicantNotesAction({
                  organizerId,
                  applicantId: applicant.id,
                  privateNotes: notes,
                });
                if (!r.ok) setError(r.error.message);
              });
            }}
          >
            Save notes
          </button>
        </section>

        {applicant.status !== "accepted" && applicant.status !== "withdrawn" ? (
          <section className="mt-6 space-y-3 border-t border-line pt-4">
            <h3 className="text-2xs font-medium uppercase text-ink-soft">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {applicant.status === "applied" ? (
                <button
                  type="button"
                  className={buttonClass("primary", "sm")}
                  disabled={pending}
                  onClick={() => setStatus("shortlisted")}
                >
                  Shortlist
                </button>
              ) : null}
              {applicant.status === "shortlisted" || applicant.status === "applied" ? (
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  disabled={pending || !interviewAt}
                  onClick={() => setStatus("interview_scheduled")}
                >
                  Schedule interview
                </button>
              ) : null}
              {applicant.status === "interview_scheduled" || applicant.status === "shortlisted" ? (
                <button
                  type="button"
                  className={buttonClass("primary", "sm")}
                  disabled={pending}
                  onClick={() => setStatus("accepted", { grantAfterOnboard: true })}
                >
                  Onboard
                </button>
              ) : null}
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                disabled={pending}
                onClick={() => setStatus("rejected")}
              >
                Reject
              </button>
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                disabled={pending}
                onClick={() => setStatus("withdrawn")}
              >
                Mark withdrawn
              </button>
            </div>

            {(applicant.status === "applied" || applicant.status === "shortlisted") && (
              <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
                <p className="text-xs text-ink-soft">Interview details (required to schedule)</p>
                <div>
                  <label className={labelClass} htmlFor="int-at">
                    Date & time
                  </label>
                  <input
                    id="int-at"
                    type="datetime-local"
                    className={fieldClass}
                    value={interviewAt}
                    onChange={(e) => setInterviewAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="int-tz">
                    Timezone
                  </label>
                  <input
                    id="int-tz"
                    className={fieldClass}
                    value={interviewTz}
                    onChange={(e) => setInterviewTz(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="int-link">
                    Meeting link
                  </label>
                  <input
                    id="int-link"
                    className={fieldClass}
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="int-loc">
                    Location
                  </label>
                  <input
                    id="int-loc"
                    className={fieldClass}
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="int-notes">
                    Notes
                  </label>
                  <input
                    id="int-notes"
                    className={fieldClass}
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>
        ) : null}

        {copyable ? (
          <div className="mt-4 space-y-2 rounded-xl bg-muted p-3 text-sm">
            <p className="font-medium text-ink">Copyable message (no email connection)</p>
            <pre className="whitespace-pre-wrap text-xs text-ink-soft">{copyable}</pre>
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => void navigator.clipboard.writeText(copyable)}
            >
              Copy message
            </button>
            {icsUrl ? (
              <a href={icsUrl} download="interview.ics" className={buttonClass("ghost", "sm")}>
                Download .ics
              </a>
            ) : null}
            <p className="text-xs text-ink-soft">
              Connect Google under Organizer → Email to send automatically next time.
            </p>
          </div>
        ) : null}

        {grantHint ? (
          <p className="mt-4 text-sm text-ink-soft">
            Member created. Open the Access tab to optionally grant dashboard permissions.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
