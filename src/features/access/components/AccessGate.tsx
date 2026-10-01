import Link from "next/link";
import { Lock, ShieldAlert, KeyRound, ArrowLeft, MailX } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

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
  // Access Denied states
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
      desc = "This event is strictly invite-only. A valid personal invite link is required to view details and register.";
    } else if (reason === "invite_expired") {
      title = "Invite Link Expired";
      desc = "The invitation link you used has passed its expiration date. Please reach out to the organizer for a new link.";
    } else if (reason === "invite_used") {
      title = "Invite Link Already Used";
      desc = "This single-use invitation has already been redeemed for a completed registration.";
    } else if (reason === "not_whitelisted") {
      title = "Private Guest List";
      desc = "This private event requires your email address to be on the organizer's guest whitelist.";
    }

    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto mb-4 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {title}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto leading-relaxed">
          {desc}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Browse Public Events</span>
          </Link>
        </div>
      </div>
    );
  }

  // Enter Code state
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
            This event is private
          </h1>
          <p className="text-xs text-neutral-500">
            Enter the access code provided by the organizer to continue.
          </p>
        </div>
      </div>

      {wrongCode ? (
        <FormFeedback error="That access code is not right. Please try again." className="mb-4" />
      ) : null}

      <form method="get" action={`/events/${eventId}`} className="flex flex-col gap-4">
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
