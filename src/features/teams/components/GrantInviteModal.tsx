"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { PERMISSION_GROUPS, PERMISSION_PRESETS } from "@/src/lib/permissions";
import { grantAccessAction } from "../actions/grants.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

const INVITE_PRESETS = ["Registration lead", "Marketing lead", "Check-in desk", "Viewer"] as const;

export function GrantInviteModal({
  organizerId,
  eventId,
  events = [],
  members = [],
  initialEmail = "",
  onClose,
  onResult,
}: {
  organizerId: string;
  eventId?: string;
  events?: { id: string; title: string }[];
  members?: { userId: string; name: string; email: string }[];
  /** Prefill email (e.g. after create team / roster Grant access). */
  initialEmail?: string;
  onClose: () => void;
  onResult?: (r: { message?: string; inviteLink?: string | null }) => void;
}) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [mode, setMode] = useState<"email" | "member">("email");
  const [email, setEmail] = useState(initialEmail);
  const [memberUserId, setMemberUserId] = useState("");
  const [emailSubject, setEmailSubject] = useState("You're invited to the event team");
  const [emailBody, setEmailBody] = useState(
    '<p>You\'ve been granted dashboard access on Avoeline.</p><p><a href="{{inviteLink}}">Set your password and open your account</a></p>',
  );
  const [scopeKind, setScopeKind] = useState<"organizer" | "event">(
    eventId ? "event" : "organizer",
  );
  const [pickedEvents, setPickedEvents] = useState<Record<string, boolean>>(() =>
    eventId ? { [eventId]: true } : {},
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selectedMember = useMemo(
    () => members.find((m) => m.userId === memberUserId),
    [members, memberUserId],
  );

  const resolvedEmail = mode === "member" ? selectedMember?.email || "" : email;

  function toggle(key: string) {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  }

  function applyPreset(name: string) {
    const keys = PERMISSION_PRESETS[name] ?? [];
    setSelected(Object.fromEntries(keys.map((k) => [k, true])));
  }

  function permissions() {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  function submit() {
    setError(null);
    setOkMsg(null);
    setTempPassword(null);
    setInviteLink(null);
    setNeedsConnection(false);
    const perms = permissions();
    if (!resolvedEmail) {
      setError("Choose a member or enter an email.");
      return;
    }
    if (!perms.length) {
      setError("Pick at least one permission.");
      return;
    }
    const eventIds =
      scopeKind === "event"
        ? Object.entries(pickedEvents)
            .filter(([, v]) => v)
            .map(([id]) => id)
        : [];
    if (scopeKind === "event" && !eventIds.length && !eventId) {
      setError("Select at least one event.");
      return;
    }
    start(async () => {
      const result = await grantAccessAction({
        email: resolvedEmail,
        organizerId,
        eventId: scopeKind === "event" ? eventId || eventIds[0] : undefined,
        eventIds: scopeKind === "event" ? eventIds : undefined,
        memberUserId: mode === "member" ? memberUserId || undefined : undefined,
        scopeType: scopeKind,
        permissions: perms,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        showTempPasswordOnce: true,
        emailSubject,
        emailBody,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOkMsg(result.data.message);
      if (result.data.tempPasswordOnce) setTempPassword(result.data.tempPasswordOnce);
      if (result.data.inviteLink) setInviteLink(result.data.inviteLink);
      setNeedsConnection(!!result.data.needsEmailConnection);
      onResult?.({
        message: result.data.message,
        inviteLink: result.data.inviteLink,
      });
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Grant access"
      description="Invite by email or pick a roster member. Passwords are never emailed."
      maxWidth="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonClass("ghost", "sm")} onClick={onClose}>
            Close
          </button>
          {step === "form" ? (
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              onClick={() => {
                if (!permissions().length) {
                  setError("Pick at least one permission.");
                  return;
                }
                setError(null);
                setStep("preview");
              }}
            >
              Preview
            </button>
          ) : (
            <>
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => setStep("form")}
              >
                Back
              </button>
              <button
                type="button"
                className={buttonClass("primary", "sm")}
                disabled={pending}
                onClick={submit}
              >
                {pending ? "Sending…" : "Send"}
              </button>
            </>
          )}
        </div>
      }
    >
      {step === "form" ? (
        <div className="space-y-3">
          <fieldset className="space-y-2">
            <legend className={labelClass}>Invitee</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === "email"} onChange={() => setMode("email")} />
              Typed email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === "member"} onChange={() => setMode("member")} />
              Existing team member
            </label>
          </fieldset>
          {mode === "email" ? (
            <div>
              <label className={labelClass} htmlFor="grant-email">
                Email
              </label>
              <input
                id="grant-email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>
          ) : (
            <div>
              <label className={labelClass} htmlFor="grant-member">
                Member
              </label>
              <select
                id="grant-member"
                className={fieldClass}
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
              >
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.userId || m.email} value={m.userId}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className={labelClass}>Scope</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scopeKind === "organizer"}
                onChange={() => setScopeKind("organizer")}
              />
              All my events
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scopeKind === "event"}
                onChange={() => setScopeKind("event")}
              />
              Selected events
            </label>
          </fieldset>
          {scopeKind === "event" ? (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-line p-3">
              {(events.length ? events : eventId ? [{ id: eventId, title: "This event" }] : []).map(
                (ev) => (
                  <label key={ev.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!pickedEvents[ev.id]}
                      onChange={(e) =>
                        setPickedEvents((s) => ({ ...s, [ev.id]: e.target.checked }))
                      }
                    />
                    {ev.title}
                  </label>
                ),
              )}
            </div>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="grant-exp">
              Expiry (optional)
            </label>
            <input
              id="grant-exp"
              type="datetime-local"
              className={fieldClass}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {INVITE_PRESETS.map((name) => (
              <button
                key={name}
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() => applyPreset(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.id} className="space-y-2 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-medium text-ink">{group.label}</legend>
              {group.permissions.map((p) => (
                <label key={p.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={!!selected[p.key]}
                    onChange={() => toggle(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </fieldset>
          ))}

          <div>
            <label className={labelClass} htmlFor="grant-subject">
              Email subject
            </label>
            <input
              id="grant-subject"
              className={fieldClass}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="grant-body">
              Email body (HTML)
            </label>
            <textarea
              id="grant-body"
              className={fieldClass}
              rows={3}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-soft">
              Use {"{{inviteLink}}"} for the set-password URL.
            </p>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            <span className="text-ink-soft">To:</span> {resolvedEmail || "—"}
          </p>
          <p>
            <span className="text-ink-soft">Scope:</span>{" "}
            {scopeKind === "organizer"
              ? "All events"
              : `${Object.values(pickedEvents).filter(Boolean).length || 1} event(s)`}
          </p>
          <p>
            <span className="text-ink-soft">Permissions:</span> {permissions().join(", ") || "—"}
          </p>
          <p>
            <span className="text-ink-soft">Expiry:</span>{" "}
            {expiresAt ? new Date(expiresAt).toLocaleString() : "None"}
          </p>
          <p className="text-ink-soft">
            Email sends only when Google is connected. Otherwise you get a copyable invite link.
            Temp password (if created) is shown once here — never in email.
          </p>
          {error ? <p className="text-red-700">{error}</p> : null}
          {okMsg ? <p className="text-ink">{okMsg}</p> : null}
          {tempPassword ? (
            <p className="rounded-lg bg-muted p-3">
              Temporary password (shown once — copy now, never emailed):{" "}
              <strong className="font-mono">{tempPassword}</strong>
            </p>
          ) : null}
          {inviteLink ? (
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">Copy invite link</p>
              <p className="mt-1 break-all font-mono text-xs">{inviteLink}</p>
              <button
                type="button"
                className={`${buttonClass("secondary", "sm")} mt-2`}
                onClick={() => void navigator.clipboard.writeText(inviteLink)}
              >
                Copy link
              </button>
            </div>
          ) : null}
          {needsConnection ? (
            <a href={`/organizer/${organizerId}/email`} className={buttonClass("ghost", "sm")}>
              Connect email
            </a>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
