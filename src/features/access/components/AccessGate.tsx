import Link from "next/link";
import { Lock, ShieldAlert, KeyRound, ArrowLeft } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { unlockAccessAction } from "../actions/unlockAccess.action";

export interface AccessGateProps {
  eventId: string;
  inviteToken: string | null;
  wrongCode?: boolean;
  reason?:
    | "needs_code"
    | "bad_code"
    | "needs_invite"
    | "invite_expired"
    | "invite_used"
    | "not_whitelisted"
    | "not_found";
}

export function AccessGate({
  eventId,
  inviteToken,
  wrongCode = false,
  reason = "needs_code",
}: AccessGateProps) {
  if (
    reason === "needs_invite" ||
    reason === "invite_expired" ||
    reason === "invite_used" ||
    reason === "not_whitelisted"
  ) {
    let title = "Access Restricted";
    let desc = "You do not currently have access to view or register for this event.";

    if (reason === "needs_invite") {
      title = "Invite-Only Event";
      desc =
        "This event is strictly invite-only. A valid personal invite link is required to view details and register.";
    } else if (reason === "invite_expired") {
      title = "Invite Link Expired";
      desc =
        "The invitation link you used has passed its expiration date. Please reach out to the organizer for a new link.";
    } else if (reason === "invite_used") {
      title = "Invite Link Already Used";
      desc = "This single-use invitation has already been redeemed for a completed registration.";
    } else if (reason === "not_whitelisted") {
      title = "Private Guest List";
      desc =
        "This private event requires your email address to be on the organizer's guest whitelist.";
    }

    return (
      <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mb-2 font-display text-xl font-bold text-ink">{title}</h1>
        <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-ink-soft">{desc}</p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Browse Public Events</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-ink-soft">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-ink">This event is private</h1>
          <p className="text-xs text-ink-soft">
            Enter the access code provided by the organizer to continue.
          </p>
        </div>
      </div>

      {wrongCode ? (
        <FormFeedback error="That access code is not right. Please try again." className="mb-4" />
      ) : null}

      <form action={unlockAccessAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        {inviteToken ? <input type="hidden" name="invite" value={inviteToken} /> : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="access-code" className={labelClass}>
            Access Passcode
          </label>
          <input
            id="access-code"
            name="code"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Enter passcode..."
            className={fieldClass}
            autoFocus
          />
        </div>

        <button type="submit" className={buttonClass("primary", "md", "w-full")}>
          Unlock Event
        </button>
      </form>
    </div>
  );
}
