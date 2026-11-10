"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { ChevronDown, X, Download, Mail, Phone } from "lucide-react";
import type { AttendeeTeamGroup } from "./AttendeeClientSide";
import type { AttendeeClientSideProp } from "./AttendeeClientSide";
import type { Registration } from "@/src/services/models/reg.type";
import { MemberEmailForm } from "./EventEmailPanels";
import { DrawerTabs } from "./DrawerTabs";
import { useToast } from "@/src/shared_components/ui/Toast";
import { formatDateMedium } from "@/src/lib/datetime";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import type { ActionResult } from "@/src/lib/action";
import { rotateTeamJoinCode } from "../actions/joinCode.action";
import { hackathonTeamCodesVisible } from "../roster";
import { registrantIdentity } from "@/src/features/event_attendee/registrantIdentity";

const PAYMENT_STATUS_OPTIONS: Registration["payment"]["paymentStatus"][] = [
  "pending",
  "completed",
  "failed",
  "refunded",
];

export function TeamGroupView({
  team,
  members,
  onClose,
  eventId,
  eventEndsAtIso,
  update_registration,
  requiresApproval = false,
  hidePayment = false,
}: {
  team: AttendeeTeamGroup;
  members: AttendeeClientSideProp[];
  onClose: () => void;
  eventId?: string;
  eventEndsAtIso?: string | null;
  update_registration?: (updated: Registration) => Promise<void> | void;
  requiresApproval?: boolean;
  hidePayment?: boolean;
}) {
  const router = useRouter();
  const lead = members.find((m) => m.register.registrationId === team.leadId) ?? members[0];
  const leadIdentity = lead
    ? registrantIdentity(lead.register, lead.user)
    : { name: "—", email: "No email", phone: "No phone", initials: "?" };
  const [leadReg, setLeadReg] = useState<Registration | null>(lead?.register ?? null);
  const [busy, setBusy] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"details" | "communication">("details");
  const [composeKey, setComposeKey] = useState(0);
  const [joinRevoked, setJoinRevoked] = useState(Boolean(team.joinCodeRevoked));
  const [joinCode, setJoinCode] = useState(team.joinCode);
  const toast = useToast();
  const [joinState, joinAction, joinPending] = useActionState<
    (ActionResult & { joinCode?: string | null }) | null,
    FormData
  >(rotateTeamJoinCode, null);
  useEffect(() => {
    if (!joinState?.success) return;
    setJoinRevoked(joinState.joinCode == null);
    setJoinCode(joinState.joinCode ?? null);
    toast.success(joinState.joinCode == null ? "Join code revoked." : "Join code regenerated.");
    router.refresh();
  }, [joinState, router, toast]);
  const checkedIn = members.filter(
    (m) =>
      m.register.checkIn?.checkedIn ||
      m.register.status === "checked_in" ||
      m.register.status === "attended",
  ).length;
  const hasAmount = !hidePayment && typeof team.amount === "number" && team.amount > 0;
  const paymentStatus =
    hasAmount && team.payment === "not_required" ? null : hidePayment ? null : team.payment;

  const commitLead = async (updated: Registration) => {
    if (!update_registration) return;
    const previous = leadReg;
    setLeadReg(updated);
    setBusy(true);
    try {
      await update_registration(updated);
      toast.success("Team payment updated.");
    } catch {
      setLeadReg(previous);
      toast.error("Could not update team payment.");
    } finally {
      setBusy(false);
    }
  };

  const showCodes = hackathonTeamCodesVisible(
    {
      payment: team.payment,
      feeStatus: team.feeStatus ?? null,
      eliminated: team.eliminated,
    },
    leadReg,
  );
  const endNote = eventEndsAtIso && showCodes ? formatDateMedium(eventEndsAtIso) : null;

  const handlePayment = (status: Registration["payment"]["paymentStatus"]) => {
    if (!leadReg) return;
    const confirms = status === "completed" && leadReg.status === "awaiting_payment";
    const nextStatus = requiresApproval ? ("pending" as const) : ("confirmed" as const);
    void commitLead({
      ...leadReg,
      payment: { ...leadReg.payment, paymentStatus: status },
      ...(confirms
        ? {
            status: nextStatus,
            statusHistory: [
              ...(leadReg.statusHistory || []),
              { status: nextStatus, timestamp: new Date().toISOString() },
            ],
          }
        : {}),
    });
  };

  return (
    <div className="relative flex flex-col gap-5 p-5">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close team details"
        className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft hover:text-ink"
      >
        <X size={18} />
      </button>
      <header className="pr-8">
        <h3 className="font-display text-2xl text-ink">{team.name}</h3>
        <p className="mt-1 text-sm text-ink-soft">{team.trackName}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {paymentStatus ? <StatusBadge status={paymentStatus} size="sm" marker="dot" /> : null}
          {leadReg ? <StatusBadge status={leadReg.status} size="sm" marker="dot" /> : null}
        </div>
        {eventId && leadReg?.registrationId ? (
          <button
            type="button"
            className={`${buttonClass("secondary", "sm")} mt-3`}
            onClick={() => {
              setDrawerTab("communication");
              setComposeKey((k) => k + 1);
            }}
          >
            Send email
          </button>
        ) : null}
      </header>
      <DrawerTabs
        tab={drawerTab}
        onTab={setDrawerTab}
        details={
          <div className="flex flex-col gap-6">
            {lead ? (
              <div className="space-y-1 text-sm text-ink-soft">
                <p className="flex items-center gap-2">
                  <Mail size={14} /> {leadIdentity.email || "No email"}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={14} /> {leadIdentity.phone || "No phone"}
                </p>
              </div>
            ) : null}
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-2xs uppercase text-ink-soft">Members</dt>
                <dd className="mt-0.5 text-ink tabular-nums">{members.length}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase text-ink-soft">Checked in</dt>
                <dd className="mt-0.5 text-ink tabular-nums">{checkedIn}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase text-ink-soft">Lead</dt>
                <dd className="mt-0.5 truncate text-ink">{leadIdentity.name}</dd>
              </div>
              {hasAmount ? (
                <div>
                  <dt className="text-2xs uppercase text-ink-soft">Amount</dt>
                  <dd className="mt-0.5 text-ink tabular-nums">
                    {formatCurrency(
                      team.amount!,
                      team.currency || leadReg?.payment?.currency || "PKR",
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
            {hasAmount && leadReg ? (
              <div>
                <label className={labelClass} htmlFor="team-payment-status">
                  Team payment
                </label>
                <div className="relative mt-1">
                  <select
                    id="team-payment-status"
                    value={leadReg.payment?.paymentStatus || "pending"}
                    disabled={busy}
                    onChange={(e) =>
                      handlePayment(e.target.value as Registration["payment"]["paymentStatus"])
                    }
                    className={`${fieldClass} appearance-none pr-9 capitalize`}
                  >
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
                    aria-hidden="true"
                  />
                </div>
              </div>
            ) : null}
            {showCodes ? (
              <div className="rounded-lg border border-line bg-muted/40 px-3 py-2 text-sm">
                {joinRevoked ? (
                  <p className="text-ink">Join code revoked. Regenerate to share a new one.</p>
                ) : joinCode ? (
                  <p className="font-mono text-ink">
                    Join code <span className="text-ink-soft">{joinCode}</span>
                  </p>
                ) : (
                  <p className="text-ink-soft">No join code yet.</p>
                )}
                {team.accessCode && !joinRevoked ? (
                  <p className="mt-1 font-mono text-ink">
                    Dashboard access <span className="text-ink-soft">{team.accessCode}</span>
                  </p>
                ) : null}
                {endNote && !joinRevoked ? (
                  <p className="mt-2 text-xs text-ink-soft">
                    Valid until the last phase closes or the event ends ({endNote}).
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={joinAction}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="mode" value="regenerate" />
                    <button
                      type="submit"
                      disabled={joinPending}
                      className={buttonClass("secondary", "sm")}
                    >
                      {joinPending ? "Working…" : "Regenerate"}
                    </button>
                  </form>
                  {!joinRevoked ? (
                    <form action={joinAction}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="mode" value="revoke" />
                      <button
                        type="submit"
                        disabled={joinPending}
                        className={buttonClass("destructive", "sm")}
                      >
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </div>
                {joinState?.error ? (
                  <FormFeedback error={joinState.error} className="mt-2" />
                ) : null}
              </div>
            ) : null}
            {team.proofUrl ? (
              <div>
                <p className="text-2xs uppercase text-ink-soft">Payment proof</p>
                <ImageLightbox
                  src={team.proofUrl}
                  alt="Team payment screenshot"
                  className="mt-1.5 aspect-video w-full bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={team.proofUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </ImageLightbox>
                <a
                  href={team.proofUrl}
                  download
                  className={`${buttonClass("secondary", "sm")} mt-2 inline-flex items-center gap-1.5`}
                >
                  <Download size={14} /> Download screenshot
                </a>
              </div>
            ) : null}
          </div>
        }
        communication={
          <div>
            {eventId && leadReg?.registrationId ? (
              <MemberEmailForm
                key={`${leadReg.registrationId}-${composeKey}`}
                eventId={eventId}
                registrationId={leadReg.registrationId}
                startOpen={composeKey > 0}
                hidePayment={hidePayment}
              />
            ) : (
              <p className="text-sm text-ink-soft">No lead email on this team.</p>
            )}
          </div>
        }
      />
    </div>
  );
}
