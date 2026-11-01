"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { useToast } from "@/src/shared_components/ui/Toast";
import { renameTeamAction } from "../actions/teamEngine.action";
import { parseTeamExtra } from "../organizerTeams.helpers";
import type { TeamWithMembers } from "../teamEngine.types";

const TEAM_TYPES = [
  { value: "", label: "Unspecified" },
  { value: "ops", label: "Operations" },
  { value: "registration", label: "Registration" },
  { value: "marketing", label: "Marketing" },
  { value: "technical", label: "Technical" },
  { value: "volunteer", label: "Volunteers" },
  { value: "other", label: "Other" },
] as const;

export function EditTeamModal({
  open,
  onClose,
  team,
}: {
  open: boolean;
  onClose: () => void;
  team: TeamWithMembers | null;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamType, setTeamType] = useState("");

  useEffect(() => {
    if (!open || !team) return;
    const extra = parseTeamExtra(team.extra);
    setName(team.name);
    setDescription(extra.description);
    setTeamType(extra.teamType);
    setError(null);
  }, [open, team]);

  function submit() {
    if (!team) return;
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("teamId", team.id);
      fd.set("name", name.trim());
      fd.set("description", description);
      fd.set("teamType", teamType);
      const res = await renameTeamAction(fd);
      if (!res.success) {
        setError(res.error || "Could not update that team.");
        return;
      }
      toast.success("Team updated.");
      onClose();
    });
  }

  return (
    <Modal
      open={open && !!team}
      onClose={onClose}
      title="Edit team"
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
          <label className={labelClass} htmlFor="edit-team-name">
            Name
          </label>
          <input
            id="edit-team-name"
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-team-desc">
            Description
          </label>
          <textarea
            id="edit-team-desc"
            className={fieldClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edit-team-type">
            Type
          </label>
          <select
            id="edit-team-type"
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
    </Modal>
  );
}
