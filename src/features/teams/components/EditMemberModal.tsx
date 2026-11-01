"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { useToast } from "@/src/shared_components/ui/Toast";
import { updateDirectMemberAction } from "../actions/teamEngine.action";
import {
  findMemberWithEmail,
  isValidTeamEmail,
  isValidTeamPhone,
  memberDisplayName,
  memberEmail,
  normalizeTeamEmail,
  parseMemberExtra,
} from "../organizerTeams.helpers";
import type { TeamMemberDoc, TeamPositionDoc, TeamWithMembers } from "../teamEngine.types";

export function EditMemberModal({
  open,
  onClose,
  team,
  member,
  positions = [],
  advanced,
}: {
  open: boolean;
  onClose: () => void;
  team: TeamWithMembers | null;
  member: TeamMemberDoc | null;
  positions?: TeamPositionDoc[];
  advanced: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [notes, setNotes] = useState("");
  const [role, setRole] = useState<"member" | "lead">("member");
  const [positionId, setPositionId] = useState("");

  useEffect(() => {
    if (!open || !member) return;
    const extra = parseMemberExtra(member.extra);
    setName(memberDisplayName(member));
    setEmail(memberEmail(member));
    setPhone(member.phone || "");
    setDesignation(extra.designation);
    setNotes(extra.notes);
    setRole(member.role === "lead" ? "lead" : "member");
    setPositionId(member.positionId || "");
    setError(null);
  }, [open, member]);

  function submit() {
    if (!team || !member) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (email.trim() && !isValidTeamEmail(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (phone.trim() && !isValidTeamPhone(phone)) {
      setError("Enter a valid phone.");
      return;
    }
    if (email.trim() && findMemberWithEmail(team.members, email, member.id)) {
      setError("That email is already on this team.");
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("teamId", team.id);
      fd.set("memberId", member.id);
      fd.set("name", name.trim());
      fd.set("email", normalizeTeamEmail(email));
      fd.set("phone", phone.trim());
      fd.set("designation", designation);
      fd.set("notes", notes);
      if (advanced) {
        fd.set("role", role);
        fd.set("positionId", positionId);
      }
      const res = await updateDirectMemberAction(fd);
      if (!res.success) {
        setError(res.error || "Could not update that member.");
        return;
      }
      toast.success("Member updated.");
      onClose();
    });
  }

  return (
    <Modal
      open={open && !!member && !!team}
      onClose={onClose}
      title="Edit member"
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
      <div className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="edit-member-name">
            Name
          </label>
          <input
            id="edit-member-name"
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-member-email">
            Email
          </label>
          <input
            id="edit-member-email"
            type="email"
            className={fieldClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-member-phone">
            Phone
          </label>
          <input
            id="edit-member-phone"
            className={fieldClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-member-desig">
            Designation
          </label>
          <input
            id="edit-member-desig"
            className={fieldClass}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-member-notes">
            Notes
          </label>
          <textarea
            id="edit-member-notes"
            className={fieldClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {advanced ? (
          <>
            <div>
              <label className={labelClass} htmlFor="edit-member-role">
                Role
              </label>
              <select
                id="edit-member-role"
                className={fieldClass}
                value={role}
                onChange={(e) => setRole(e.target.value === "lead" ? "lead" : "member")}
              >
                <option value="member">Member</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            {positions.length ? (
              <div>
                <label className={labelClass} htmlFor="edit-member-pos">
                  Position
                </label>
                <select
                  id="edit-member-pos"
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
          </>
        ) : null}
      </div>
    </Modal>
  );
}
