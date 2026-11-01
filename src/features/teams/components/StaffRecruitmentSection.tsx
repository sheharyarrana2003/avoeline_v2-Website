"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormBuilder } from "@/src/features/events/components/wizard/FormBuilder";
import type { CustomField } from "@/src/services/models/event.model";
import {
  addStaffApplicant,
  addStaffPosition,
  saveStaffRecruitmentForm,
  setStaffApplicantStatus,
  updateStaffPosition,
} from "../actions/staffAdvanced.action";
import {
  APPLICANT_NEXT,
  APPLICANT_STATUS_LABEL,
  APPLICANT_STATUSES,
  STAFF_PERMISSIONS,
  STAFF_TITLE_PRESETS,
  EVENT_STAFF_POSITIONS,
  type ApplicantStatus,
  type RecruitmentFormDoc,
  type StaffApplicant,
  type TeamPositionDoc,
  type TeamWithMembers,
} from "../teamEngine.types";
import { CopyShareLink } from "./CopyShareLink";

export type StaffRosterAdvanced = {
  team: TeamWithMembers;
  positions: TeamPositionDoc[];
  applicants: StaffApplicant[];
  forms: RecruitmentFormDoc[];
};

function applicantName(a: StaffApplicant): string {
  return String(a.responses.name || a.email || "Applicant");
}

function permissionSummary(keys: string[]): string {
  if (!keys.length) return "No permissions set";
  const labels = STAFF_PERMISSIONS.filter((p) => keys.includes(p.key)).map((p) => p.label);
  return labels.join(" · ") || keys.join(" · ");
}

function AddPositionFields({ rosterId }: { rosterId: string }) {
  const [title, setTitle] = useState("");
  const preset = STAFF_TITLE_PRESETS[title] ?? [];
  return (
    <>
      <div>
        <label className={labelClass} htmlFor={`pos-title-${rosterId}`}>
          Position title
        </label>
        <input
          id={`pos-title-${rosterId}`}
          name="title"
          required
          list={`pos-titles-${rosterId}`}
          className={fieldClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <datalist id={`pos-titles-${rosterId}`}>
          {EVENT_STAFF_POSITIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <fieldset>
        <legend className={labelClass}>Permissions</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {STAFF_PERMISSIONS.map((p) => (
            <label key={p.key} className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="permissions"
                value={p.key}
                className="mt-0.5 h-4 w-4 accent-current"
                defaultChecked={preset.includes(p.key)}
                key={`${title}-${p.key}`}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function StaffRecruitmentSection({
  eventId,
  organizerId,
  applyBase,
  rosters,
  tracks = [],
}: {
  eventId: string;
  organizerId: string;
  applyBase: string;
  rosters: StaffRosterAdvanced[];
  tracks?: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-6">
      {rosters.map((roster) => (
        <RosterRecruitment
          key={roster.team.id}
          eventId={eventId}
          organizerId={organizerId}
          applyBase={applyBase}
          roster={roster}
          tracks={tracks}
        />
      ))}
    </div>
  );
}

function RosterRecruitment({
  eventId,
  organizerId,
  applyBase,
  roster,
  tracks,
}: {
  eventId: string;
  organizerId: string;
  applyBase: string;
  roster: StaffRosterAdvanced;
  tracks: { id: string; name: string }[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingFormFor, setEditingFormFor] = useState<string | null>(null);
  const hidden = (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="teamId" value={roster.team.id} />
    </>
  );

  return (
    <Card title={roster.team.name}>
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-ink">Positions</h3>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setAdding((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add position
          </button>
        </div>
        {adding ? (
          <form action={addStaffPosition} className="space-y-3 rounded-xl border border-line p-4">
            {hidden}
            <AddPositionFields rosterId={roster.team.id} />
            {tracks.length ? (
              <fieldset>
                <legend className={labelClass}>Competitions (empty = all)</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {tracks.map((t) => (
                    <label key={t.id} className="flex items-start gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        name="trackIds"
                        value={t.id}
                        className="mt-0.5 h-4 w-4 accent-current"
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  People in this position need an Avoeline account (matched email) to sign in.
                </p>
              </fieldset>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button type="submit" className={buttonClass("primary", "sm")}>
                Save position
              </button>
            </div>
          </form>
        ) : null}
        {roster.positions.length === 0 ? (
          <p className="text-sm text-ink-soft">No named positions yet.</p>
        ) : (
          <div className="grid gap-4">
            {roster.positions.map((position, index) => {
              const form = roster.forms.find((f) => f.positionId === position.id);
              const applicants = roster.applicants.filter((a) => a.positionId === position.id);
              const members = roster.team.members.filter((m) => m.positionId === position.id);
              const applyUrl = form?.publicToken
                ? `${applyBase.replace(/\/$/, "")}/apply/${form.publicToken}`
                : form
                  ? `${applyBase.replace(/\/$/, "")}/events/${eventId}/staff-apply/${form.id}`
                  : "";
              return (
                <div key={position.id} className="space-y-4 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{position.title}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {permissionSummary(position.permissions)}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {position.trackIds?.length
                          ? `Competitions: ${position.trackIds.map((id) => tracks.find((t) => t.id === id)?.name || id).join(", ")}`
                          : "All competitions"}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {applicants.length} applicant{applicants.length === 1 ? "" : "s"} ·{" "}
                        {members.length} member
                        {members.length === 1 ? "" : "s"}
                        {roster.positions.filter((p) => p.title === position.title).length > 1
                          ? ` · Slot ${index + 1}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={buttonClass("secondary", "sm")}
                      onClick={() =>
                        setEditingFormFor((id) => (id === position.id ? null : position.id))
                      }
                    >
                      Recruitment form
                    </button>
                  </div>
                  {form ? <CopyShareLink url={applyUrl} /> : null}
                  <form
                    action={updateStaffPosition}
                    className="space-y-2 rounded-xl border border-dashed border-line p-3"
                  >
                    {hidden}
                    <input type="hidden" name="positionId" value={position.id} />
                    <p className="text-xs font-semibold uppercase text-ink-soft">
                      Dashboard access
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {STAFF_PERMISSIONS.map((p) => (
                        <label key={p.key} className="flex items-start gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            name="permissions"
                            value={p.key}
                            defaultChecked={position.permissions.includes(p.key)}
                            className="mt-0.5 h-4 w-4 accent-current"
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                    {tracks.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {tracks.map((t) => (
                          <label key={t.id} className="flex items-start gap-2 text-sm text-ink">
                            <input
                              type="checkbox"
                              name="trackIds"
                              value={t.id}
                              defaultChecked={position.trackIds?.includes(t.id)}
                              className="mt-0.5 h-4 w-4 accent-current"
                            />
                            <span>{t.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <button type="submit" className={buttonClass("secondary", "sm")}>
                      Save access
                    </button>
                  </form>
                  {editingFormFor === position.id ? (
                    <RecruitmentFormEditor
                      eventId={eventId}
                      organizerId={organizerId}
                      teamId={roster.team.id}
                      position={position}
                      form={form}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-line pt-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Applicant pipeline</h3>
          <ApplicantPipeline
            eventId={eventId}
            organizerId={organizerId}
            positions={roster.positions}
            applicants={roster.applicants}
          />
        </div>

        {roster.positions.length ? (
          <form action={addStaffApplicant} className="space-y-3 border-t border-line pt-5">
            {hidden}
            <p className="text-sm font-medium text-ink">Add applicant manually</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor={`app-name-${roster.team.id}`}>
                  Applicant name
                </label>
                <input
                  id={`app-name-${roster.team.id}`}
                  name="name"
                  required
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`app-email-${roster.team.id}`}>
                  Email
                </label>
                <input
                  id={`app-email-${roster.team.id}`}
                  name="email"
                  type="email"
                  required
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`app-pos-${roster.team.id}`}>
                  Position
                </label>
                <select
                  id={`app-pos-${roster.team.id}`}
                  name="positionId"
                  className={fieldClass}
                  defaultValue=""
                >
                  <option value="">Unassigned</option>
                  {roster.positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor={`app-note-${roster.team.id}`}>
                  Note
                </label>
                <input id={`app-note-${roster.team.id}`} name="note" className={fieldClass} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className={buttonClass("secondary", "sm")}>
                Add applicant
              </button>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}

function RecruitmentFormEditor({
  eventId,
  organizerId,
  teamId,
  position,
  form,
}: {
  eventId: string;
  organizerId: string;
  teamId: string;
  position: TeamPositionDoc;
  form?: RecruitmentFormDoc;
}) {
  const initial: CustomField[] = (form?.fields ?? []).map((f) => ({
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
  const [fields, setFields] = useState<CustomField[]>(
    initial.length
      ? initial
      : [
          {
            id: "why",
            label: "Why do you want this role?",
            type: "long_text",
            required: true,
            options: [],
          },
        ],
  );

  const persistFields = fields.map((f) => ({
    key: f.id,
    id: f.id,
    label: f.label,
    type: f.type === "dropdown" ? "select" : f.type === "checkboxes" ? "checkbox" : f.type,
    options: f.options,
    required: f.required,
  }));

  return (
    <form
      action={saveStaffRecruitmentForm}
      className="space-y-4 rounded-xl border border-dashed border-line p-4"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="positionId" value={position.id} />
      <input type="hidden" name="fields" value={JSON.stringify(persistFields)} />
      <div>
        <label className={labelClass} htmlFor={`form-title-${position.id}`}>
          Form title
        </label>
        <input
          id={`form-title-${position.id}`}
          name="title"
          defaultValue={form?.title || `${position.title} application`}
          className={fieldClass}
        />
      </div>
      <FormBuilder fields={fields} onChange={setFields} />
      <div className="flex justify-end">
        <button type="submit" className={buttonClass("primary", "sm")}>
          Save & publish link
        </button>
      </div>
    </form>
  );
}

function ApplicantPipeline({
  eventId,
  organizerId,
  positions,
  applicants,
}: {
  eventId: string;
  organizerId: string;
  positions: TeamPositionDoc[];
  applicants: StaffApplicant[];
}) {
  if (!applicants.length) {
    return <p className="text-sm text-ink-soft">No applicants yet.</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {APPLICANT_STATUSES.map((status) => {
        const rows = applicants.filter((a) => a.status === status);
        return (
          <div key={status} className="space-y-3 rounded-xl border border-line p-3">
            <p className="text-2xs font-medium uppercase text-ink-soft">
              {APPLICANT_STATUS_LABEL[status]} · {rows.length}
            </p>
            {rows.length === 0 ? <p className="text-xs text-ink-faint">None</p> : null}
            {rows.map((a) => (
              <ApplicantCard
                key={a.id}
                applicant={a}
                eventId={eventId}
                organizerId={organizerId}
                positionTitle={positions.find((p) => p.id === a.positionId)?.title}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RecruitmentEmailFields({
  applicantId,
  kind,
}: {
  applicantId: string;
  kind: "shortlisted" | "accepted";
}) {
  const defaults =
    kind === "shortlisted"
      ? {
          subject: "You've been shortlisted for the event team",
          body: "<p>Hello {{name}},</p><p>You've been shortlisted for the event team. We'll follow up with next steps.</p>",
        }
      : {
          subject: "You're on the event team — set your password",
          body: '<p>Hello {{name}},</p><p>You\'ve been accepted onto the event team.</p><p><a href="{{inviteLink}}">Set your password</a></p>',
        };
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-line p-3">
      <p className="text-xs text-ink-soft">
        Sent via your connected Google account. Use {"{{name}}"}
        {kind === "accepted" ? " and {{inviteLink}}" : ""}.
      </p>
      <div>
        <label className={labelClass} htmlFor={`email-sub-${applicantId}-${kind}`}>
          Email subject
        </label>
        <input
          id={`email-sub-${applicantId}-${kind}`}
          name="emailSubject"
          className={fieldClass}
          defaultValue={defaults.subject}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`email-body-${applicantId}-${kind}`}>
          Email body (HTML)
        </label>
        <textarea
          id={`email-body-${applicantId}-${kind}`}
          name="emailBody"
          rows={3}
          className={fieldClass}
          defaultValue={defaults.body}
        />
      </div>
    </div>
  );
}

function ApplicantCard({
  applicant,
  eventId,
  organizerId,
  positionTitle,
}: {
  applicant: StaffApplicant;
  eventId: string;
  organizerId: string;
  positionTitle?: string;
}) {
  const next = APPLICANT_NEXT[applicant.status];
  const [interviewOpen, setInterviewOpen] = useState(false);
  const applied = applicant.appliedAt ? new Date(applicant.appliedAt).toLocaleDateString() : "";

  return (
    <div className="space-y-2 rounded-xl border border-line bg-paper p-3">
      <p className="text-sm font-medium text-ink">{applicantName(applicant)}</p>
      <p className="text-xs text-ink-soft">
        {applicant.email}
        {positionTitle ? ` · ${positionTitle}` : ""}
        {applied ? ` · Applied ${applied}` : ""}
      </p>
      {next ? (
        next === "interview_scheduled" && !interviewOpen ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setInterviewOpen(true)}
          >
            Move to {APPLICANT_STATUS_LABEL[next]}
          </button>
        ) : (
          <form action={setStaffApplicantStatus} className="space-y-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="organizerId" value={organizerId} />
            <input type="hidden" name="applicantId" value={applicant.id} />
            <input type="hidden" name="status" value={next} />
            {next === "interview_scheduled" ? (
              <>
                <div>
                  <label className={labelClass} htmlFor={`int-at-${applicant.id}`}>
                    Interview date and time
                  </label>
                  <input
                    id={`int-at-${applicant.id}`}
                    name="interviewAt"
                    type="datetime-local"
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`int-note-${applicant.id}`}>
                    Notes
                  </label>
                  <input
                    id={`int-note-${applicant.id}`}
                    name="interviewNotes"
                    className={fieldClass}
                  />
                </div>
              </>
            ) : null}
            {next === "shortlisted" || next === "accepted" ? (
              <RecruitmentEmailFields applicantId={applicant.id} kind={next} />
            ) : null}
            <button type="submit" className={buttonClass("primary", "sm")}>
              Move to {APPLICANT_STATUS_LABEL[next]}
            </button>
          </form>
        )
      ) : null}
      {applicant.status !== "rejected" && applicant.status !== "accepted" ? (
        <form action={setStaffApplicantStatus}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input type="hidden" name="applicantId" value={applicant.id} />
          <input type="hidden" name="status" value="rejected" />
          <button type="submit" className={buttonClass("ghost", "sm")}>
            Reject
          </button>
        </form>
      ) : null}
    </div>
  );
}
