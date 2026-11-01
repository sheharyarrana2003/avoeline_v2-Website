"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { useToast } from "@/src/shared_components/ui/Toast";
import { createTeamAction } from "../actions/teamEngine.action";
import {
  hasDuplicateEmailInList,
  isValidTeamEmail,
  isValidTeamPhone,
  normalizeTeamEmail,
} from "../organizerTeams.helpers";

type ExtraRow = {
  name: string;
  email: string;
  phone: string;
  designation: string;
};

const TEAM_TYPES = [
  { value: "", label: "Unspecified" },
  { value: "ops", label: "Operations" },
  { value: "registration", label: "Registration" },
  { value: "marketing", label: "Marketing" },
  { value: "technical", label: "Technical" },
  { value: "volunteer", label: "Volunteers" },
  { value: "other", label: "Other" },
] as const;

export function AddTeamModal({
  open,
  onClose,
  organizerId,
  currentUser,
  advanced,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  organizerId: string;
  currentUser: { userId: string; name: string; email: string; phone?: string };
  advanced: boolean;
  onCreated?: (payload: { teamId: string; inviteLead: boolean; leadEmail: string }) => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamType, setTeamType] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadDesignation, setLeadDesignation] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadIsMe, setLeadIsMe] = useState(false);
  const [inviteLead, setInviteLead] = useState(false);
  const [extras, setExtras] = useState<ExtraRow[]>([]);

  function reset() {
    setStep(1);
    setError(null);
    setName("");
    setDescription("");
    setTeamType("");
    setLeadName("");
    setLeadEmail("");
    setLeadPhone("");
    setLeadDesignation("");
    setLeadNotes("");
    setLeadIsMe(false);
    setInviteLead(false);
    setExtras([]);
  }

  function close() {
    reset();
    onClose();
  }

  function applyLeadIsMe(checked: boolean) {
    setLeadIsMe(checked);
    if (checked) {
      setLeadName(currentUser.name || "");
      setLeadEmail(currentUser.email || "");
      if (currentUser.phone) setLeadPhone(currentUser.phone);
    }
  }

  const step1Ok = name.trim().length > 0;

  const duplicateInExtras = useMemo(() => {
    const emails = [leadEmail, ...extras.map((e) => e.email)];
    for (let i = 1; i < emails.length; i++) {
      if (hasDuplicateEmailInList(emails, emails[i] || "", i)) return true;
    }
    return false;
  }, [leadEmail, extras]);

  function validateExtras(): string | null {
    for (const row of extras) {
      if (!row.name.trim()) continue;
      if (row.email.trim() && !isValidTeamEmail(row.email)) {
        return `Invalid email for ${row.name.trim()}.`;
      }
      if (row.phone.trim() && !isValidTeamPhone(row.phone)) {
        return `Invalid phone for ${row.name.trim()}.`;
      }
    }
    if (duplicateInExtras) return "Duplicate emails within this team are not allowed.";
    return null;
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!step1Ok) {
        setError("Team name is required.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!leadName.trim() || !leadEmail.trim()) {
        setError("Lead name and email are required.");
        return;
      }
      if (!isValidTeamEmail(leadEmail)) {
        setError("Enter a valid lead email.");
        return;
      }
      if (!isValidTeamPhone(leadPhone)) {
        setError("Enter a valid lead phone.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const err = validateExtras();
      if (err) {
        setError(err);
        return;
      }
      setStep(4);
    }
  }

  function create() {
    setError(null);
    const err = validateExtras();
    if (err) {
      setError(err);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("contextType", "event_staff");
      fd.set("parentRef", organizerId);
      fd.set("organizerId", organizerId);
      if (description.trim()) fd.set("description", description.trim());
      if (teamType) fd.set("teamType", teamType);
      fd.set("leadName", leadName.trim());
      fd.set("leadEmail", normalizeTeamEmail(leadEmail));
      if (leadPhone.trim()) fd.set("leadPhone", leadPhone.trim());
      if (leadDesignation.trim()) fd.set("leadDesignation", leadDesignation.trim());
      if (leadNotes.trim()) fd.set("leadNotes", leadNotes.trim());
      if (leadIsMe) fd.set("leadIsMe", "1");
      const members = extras
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          email: r.email.trim() || undefined,
          phone: r.phone.trim() || undefined,
          designation: r.designation.trim() || undefined,
        }));
      if (members.length) fd.set("membersJson", JSON.stringify(members));

      const res = await createTeamAction(fd);
      if (!res.ok) {
        setError(res.error || "Could not create that team.");
        return;
      }
      toast.success(`Team “${name.trim()}” created.`);
      const invite = advanced && inviteLead;
      const email = normalizeTeamEmail(leadEmail);
      close();
      onCreated?.({ teamId: res.data.teamId, inviteLead: invite, leadEmail: email });
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add team"
      description={`Step ${step} of 4`}
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            onClick={close}
            disabled={pending}
          >
            Cancel
          </button>
          {step > 1 ? (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              disabled={pending}
            >
              Back
            </button>
          ) : null}
          {step < 4 ? (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={next}
              disabled={pending}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={create}
              disabled={pending}
            >
              {pending ? "Creating…" : "Create team"}
            </button>
          )}
        </>
      }
    >
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      {step === 1 ? (
        <div className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="add-team-name">
              Name
            </label>
            <input
              id="add-team-name"
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-team-desc">
              Description
            </label>
            <textarea
              id="add-team-desc"
              className={fieldClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-team-type">
              Type
            </label>
            <select
              id="add-team-type"
              className={fieldClass}
              value={teamType}
              onChange={(e) => setTeamType(e.target.value)}
            >
              {TEAM_TYPES.map((t) => (
                <option key={t.value || "none"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={leadIsMe}
              onChange={(e) => applyLeadIsMe(e.target.checked)}
            />
            Lead is me
          </label>
          <div>
            <label className={labelClass} htmlFor="add-lead-name">
              Lead name
            </label>
            <input
              id="add-lead-name"
              className={fieldClass}
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-lead-email">
              Lead email
            </label>
            <input
              id="add-lead-email"
              type="email"
              className={fieldClass}
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-lead-phone">
              Lead phone
            </label>
            <input
              id="add-lead-phone"
              className={fieldClass}
              value={leadPhone}
              onChange={(e) => setLeadPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-lead-desig">
              Designation
            </label>
            <input
              id="add-lead-desig"
              className={fieldClass}
              value={leadDesignation}
              onChange={(e) => setLeadDesignation(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-lead-notes">
              Notes
            </label>
            <textarea
              id="add-lead-notes"
              className={fieldClass}
              rows={2}
              value={leadNotes}
              onChange={(e) => setLeadNotes(e.target.value)}
            />
          </div>
          {advanced ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={inviteLead}
                onChange={(e) => setInviteLead(e.target.checked)}
              />
              Invite the lead to dashboard
            </label>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">Optional members (besides the lead).</p>
          {extras.map((row, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2">
              <input
                className={fieldClass}
                placeholder="Name"
                aria-label={`Extra member ${i + 1} name`}
                value={row.name}
                onChange={(e) =>
                  setExtras((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)),
                  )
                }
              />
              <input
                className={fieldClass}
                placeholder="Email"
                type="email"
                aria-label={`Extra member ${i + 1} email`}
                value={row.email}
                onChange={(e) =>
                  setExtras((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, email: e.target.value } : r)),
                  )
                }
              />
              <input
                className={fieldClass}
                placeholder="Phone"
                aria-label={`Extra member ${i + 1} phone`}
                value={row.phone}
                onChange={(e) =>
                  setExtras((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, phone: e.target.value } : r)),
                  )
                }
              />
              <input
                className={fieldClass}
                placeholder="Designation"
                aria-label={`Extra member ${i + 1} designation`}
                value={row.designation}
                onChange={(e) =>
                  setExtras((prev) =>
                    prev.map((r, idx) => (idx === i ? { ...r, designation: e.target.value } : r)),
                  )
                }
              />
            </div>
          ))}
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() =>
              setExtras((prev) => [...prev, { name: "", email: "", phone: "", designation: "" }])
            }
          >
            Add member row
          </button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-2 text-sm text-ink">
          <p>
            <span className="text-ink-soft">Team:</span> {name.trim()}
            {teamType ? ` · ${teamType}` : ""}
          </p>
          {description.trim() ? <p className="text-ink-soft">{description.trim()}</p> : null}
          <p>
            <span className="text-ink-soft">Lead:</span> {leadName.trim()} (
            {normalizeTeamEmail(leadEmail)}){leadPhone.trim() ? ` · ${leadPhone.trim()}` : ""}
          </p>
          <p>
            <span className="text-ink-soft">Members:</span>{" "}
            {1 + extras.filter((r) => r.name.trim()).length} (including lead)
          </p>
          {advanced && inviteLead ? (
            <p className="text-ink-soft">After create, you can invite the lead to the dashboard.</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
