"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { useToast } from "@/src/shared_components/ui/Toast";
import { addDirectMemberAction } from "../actions/teamEngine.action";
import {
  findMemberWithEmail,
  isValidTeamEmail,
  isValidTeamPhone,
  normalizeTeamEmail,
} from "../organizerTeams.helpers";
import type { TeamPositionDoc, TeamWithMembers } from "../teamEngine.types";

export function AddMemberModal({
  open,
  onClose,
  teams,
  positionsByTeam,
  advanced,
  preselectTeamId,
}: {
  open: boolean;
  onClose: () => void;
  teams: TeamWithMembers[];
  positionsByTeam?: Map<string, TeamPositionDoc[]>;
  advanced: boolean;
  preselectTeamId?: string | null;
}) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [teamId, setTeamId] = useState(preselectTeamId || teams[0]?.id || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [role, setRole] = useState<"member" | "lead">("member");
  const [positionId, setPositionId] = useState("");

  const selectedTeam = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);
  const positions = positionsByTeam?.get(teamId) ?? [];

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    setTeamId(preselectTeamId || teams[0]?.id || "");
    setName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setRole("member");
    setPositionId("");
  }, [open, preselectTeamId, teams]);

  function close() {
    onClose();
  }

  function validateForm(): string | null {
    if (!teamId) return "Choose a team.";
    if (!name.trim()) return "Name is required.";
    if (!email.trim() || !isValidTeamEmail(email)) return "A valid email is required.";
    if (phone.trim() && !isValidTeamPhone(phone)) return "Enter a valid phone number.";
    if (selectedTeam && findMemberWithEmail(selectedTeam.members, email)) {
      return "That email is already on this team.";
    }
    return null;
  }

  function next() {
    setError(null);
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setStep(2);
  }

  function submit() {
    setError(null);
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("teamId", teamId);
      fd.set("name", name.trim());
      fd.set("email", normalizeTeamEmail(email));
      if (phone.trim()) fd.set("phone", phone.trim());
      if (designation.trim()) fd.set("designation", designation.trim());
      fd.set("role", role);
      if (advanced && positionId) fd.set("positionId", positionId);
      const res = await addDirectMemberAction(fd);
      if (!res.success) {
        setError(res.error || "Could not add that member.");
        return;
      }
      toast.success(`${name.trim()} added.`);
      close();
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add member"
      description={step === 1 ? "Details" : "Preview"}
      maxWidth="md"
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
          {step === 2 ? (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setStep(1)}
              disabled={pending}
            >
              Back
            </button>
          ) : null}
          {step === 1 ? (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={next}
              disabled={pending}
            >
              Preview
            </button>
          ) : (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={submit}
              disabled={pending}
            >
              {pending ? "Adding…" : "Add member"}
            </button>
          )}
        </>
      }
    >
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      {step === 1 ? (
        <div className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="add-member-team">
              Team
            </label>
            <select
              id="add-member-team"
              className={fieldClass}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPositionId("");
              }}
              required
            >
              {!teams.length ? <option value="">No teams</option> : null}
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="add-member-name">
              Name
            </label>
            <input
              id="add-member-name"
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-member-email">
              Email
            </label>
            <input
              id="add-member-email"
              type="email"
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-member-phone">
              Phone
            </label>
            <input
              id="add-member-phone"
              className={fieldClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-member-desig">
              Designation
            </label>
            <input
              id="add-member-desig"
              className={fieldClass}
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="add-member-role">
              Role
            </label>
            <select
              id="add-member-role"
              className={fieldClass}
              value={role}
              onChange={(e) => setRole(e.target.value === "lead" ? "lead" : "member")}
            >
              <option value="member">Member</option>
              <option value="lead">Lead (demotes current lead)</option>
            </select>
          </div>
          {advanced && positions.length ? (
            <div>
              <label className={labelClass} htmlFor="add-member-pos">
                Position
              </label>
              <select
                id="add-member-pos"
                className={fieldClass}
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
              >
                <option value="">None</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 text-sm text-ink">
          <p>
            <span className="text-ink-soft">Team:</span> {selectedTeam?.name || "—"}
          </p>
          <p>
            <span className="text-ink-soft">Name:</span> {name.trim()}
          </p>
          <p>
            <span className="text-ink-soft">Email:</span> {normalizeTeamEmail(email)}
          </p>
          {phone.trim() ? (
            <p>
              <span className="text-ink-soft">Phone:</span> {phone.trim()}
            </p>
          ) : null}
          {designation.trim() ? (
            <p>
              <span className="text-ink-soft">Designation:</span> {designation.trim()}
            </p>
          ) : null}
          <p>
            <span className="text-ink-soft">Role:</span> {role === "lead" ? "Lead" : "Member"}
          </p>
        </div>
      )}
    </Modal>
  );
}
