import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, Download, Flag, X } from "lucide-react";
import {
  getPublicEvent,
  getRegistrationById,
  isPaidEvent,
} from "@/src/features/registration/registration.service";
import { AgendaService, sessionsForTier } from "@/src/features/agendas/agenda.service";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDate, formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { buttonClass } from "@/src/lib/ui";
import {
  eventIsHackathon,
  getTrack,
  listTracks,
  teamsForRegistration,
} from "@/src/features/hackathon/hackathon.service";
import { eventLifecycle } from "@/src/lib/eventState";
import TicketFeedbackForm from "@/src/features/analytics/components/TicketFeedbackForm";
import { TicketCalendarMenu } from "@/src/features/registration/components/ticket/TicketCalendarMenu";
import { CopyShortCode } from "@/src/features/registration/components/ticket/CopyShortCode";
import {
  registrationDisplayCode,
  ticketHeroCopy,
  ticketHeroState,
  ticketShowsQr,
  whatHappensNextLine,
} from "@/src/features/registration/ticketPage.logic";
import { RegService } from "@/src/services/registeration.service";
import { EventService } from "@/src/services/event.service";

export const metadata = {
  title: "Your ticket — Avoeline",
};

/**
 * Attendee ticket (capability URL = registration UUID). Short code is display-only.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ eventId: string; registrationId: string }>;
}) {
  const { eventId, registrationId } = await params;

  const [registration, event] = await Promise.all([
    getRegistrationById(registrationId),
    getPublicEvent(eventId),
  ]);

  if (!registration || !event || registration.eventId !== event.id) notFound();

  const fullEvent = await EventService.getEventByID(eventId).catch(() => null);
  const attendeeName = registration.attendee?.name || "Attendee";
  const hero = ticketHeroState(registration.status);
  const copy = ticketHeroCopy(registration.status, event.title, registration.waitlistPosition);
  const showQr = ticketShowsQr(registration.status);
  const shortCode = registrationDisplayCode(registration.shortCode);
  const qrImageSrc = showQr ? registration.qrCode?.imageUrl || "" : "";
  const paid = fullEvent ? isPaidEvent(fullEvent) : Number(registration.finalPrice || 0) > 0;
  const requiresApproval = Boolean(
    fullEvent?.approvalRequired ?? fullEvent?.access?.requiresApproval,
  );
  const nextLine = whatHappensNextLine({
    status: registration.status,
    isFree: !paid,
    requiresApproval,
  });

  const hackathon = await eventIsHackathon(event);
  const preferredTrack = registration.hackathonTrackId
    ? await getTrack(registration.hackathonTrackId)
    : null;
  const tracks = hackathon ? await listTracks(event.id) : [];
  const teams = hackathon ? await teamsForRegistration(registration.registrationId) : [];
  const team = teams.find((t) => t.eventId === event.id) || teams[0] || null;
  const teamAccessCode = team?.accessCode ?? null;
  const isLead = registration.hackathonRole === "team_lead" || registration.groupRole === "lead";

  let memberTickets: Array<{
    name: string;
    shortCode: string;
    qrImageSrc: string;
    isSelf: boolean;
  }> = [];
  if (showQr && isLead && team?.memberRegistrationIds?.length) {
    const regs = await RegService.getRegsByIds(team.memberRegistrationIds).catch(() => []);
    memberTickets = regs
      .filter((r) => r.eventId === event.id)
      .map((r) => ({
        name: r.attendee?.name || "Member",
        shortCode: registrationDisplayCode(r.shortCode),
        qrImageSrc: r.qrCode?.imageUrl || "",
        isSelf: r.registrationId === registration.registrationId,
      }));
  }

  const sessions = sessionsForTier(
    await AgendaService.getSessionsByEventId(eventId),
    registration.tier,
  );

  const HeroIcon =
    hero === "confirmed" ? Check : hero === "rejected" || hero === "cancelled" ? X : Clock;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col items-center text-center">
        <span
          className={`mb-6 flex size-14 items-center justify-center rounded-full ${
            hero === "confirmed"
              ? "bg-ink text-ink-invert"
              : hero === "rejected" || hero === "cancelled"
                ? "bg-muted text-ink-soft"
                : "bg-muted text-ink"
          }`}
          aria-hidden="true"
        >
          <HeroIcon className="h-7 w-7" strokeWidth={hero === "confirmed" ? 3 : 2} />
        </span>

        <h1 className="font-display text-2xl text-ink">{copy.title}</h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">{copy.note}</p>
        <div className="mt-5">
          <TicketCalendarMenu
            registrationStatus={registration.status}
            event={{
              id: event.id,
              title: event.title,
              shortDescription: event.shortDescription || "",
              schedule: {
                startDate: event.schedule?.startDate || "",
                endDate: event.schedule?.endDate || event.schedule?.startDate || "",
                startTime: event.schedule?.startTime || "",
                endTime: event.schedule?.endTime || "",
                timezone: event.schedule?.timezone || "Asia/Karachi",
                formatLabel: String(event.format || ""),
              },
              location: {
                venueName: event.location?.venueName || "",
                address: event.location?.address || "",
                city: event.location?.city || "",
                mapsUrl: event.mapsUrl || event.mapUrl || "",
              },
              sharePath: `/events/${event.id}`,
            }}
          />
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-base text-ink">Details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Detail label="Event" value={event.title} />
          <Detail
            label="When"
            value={`${formatDateMedium(event.schedule?.startDate)} · ${formatTime(event.schedule?.startTime)}${
              event.schedule?.timezone ? ` (${event.schedule.timezone})` : ""
            }`}
          />
          <Detail
            label="Venue"
            value={
              [event.location?.venueName, event.location?.city].filter(Boolean).join(", ") || "—"
            }
          />
          <Detail label="Ticket" value={registration.pricingTier || "—"} />
          {preferredTrack ? <Detail label="Competition" value={preferredTrack.name} /> : null}
          <Detail
            label="Price"
            value={formatCurrency(
              registration.finalPrice,
              registration.payment?.currency || "PKR",
              "Free",
            )}
          />
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-soft">Status</dt>
            <dd>
              <StatusBadge status={registration.status} size="sm" />
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-soft">Short code</dt>
            <dd>
              <CopyShortCode code={shortCode === "—" ? "" : shortCode} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-base text-ink">What happens next</h2>
        <p className="mt-2 text-sm text-ink-soft">{nextLine}</p>
      </section>

      {showQr && qrImageSrc ? (
        <section className="mt-6 rounded-2xl border border-line bg-paper p-6">
          <h2 className="font-display text-base text-ink">Your QR</h2>
          <div className="mt-4 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageSrc}
              alt={`Entry QR code for ${attendeeName}`}
              className="size-56 rounded-xl bg-white p-3"
            />
            <a
              href={qrImageSrc}
              download={`${shortCode || "ticket"}-qr.png`}
              className={`${buttonClass("secondary", "sm")} mt-4`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download QR
            </a>
            <p className="mt-3 text-xs text-ink-soft">Show this at the entrance.</p>
          </div>
        </section>
      ) : null}

      {team && (team.name || preferredTrack) ? (
        <section className="mt-6 rounded-2xl border border-line bg-paper p-6">
          <h2 className="font-display text-base text-ink">Team</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {team.name ? <Detail label="Team" value={team.name} /> : null}
            {preferredTrack ? <Detail label="Competition" value={preferredTrack.name} /> : null}
          </dl>
          {memberTickets.length ? (
            <ul className="mt-6 space-y-6">
              {memberTickets.map((m) => (
                <li
                  key={m.shortCode + m.name}
                  className="border-t border-line pt-4 first:border-0 first:pt-0"
                >
                  <p className="text-sm font-medium text-ink">
                    {m.name}
                    {m.isSelf ? " (you)" : ""}
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink-soft">{m.shortCode}</p>
                  {m.qrImageSrc ? (
                    <div className="mt-3 flex flex-col items-start gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.qrImageSrc}
                        alt={`QR for ${m.name}`}
                        className="size-40 rounded-xl bg-white p-2"
                      />
                      <a
                        href={m.qrImageSrc}
                        download={`${m.shortCode || "member"}-qr.png`}
                        className={buttonClass("ghost", "sm")}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Download
                      </a>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {sessions.length ? (
        <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
          <h2 className="font-display text-base text-ink">
            Your schedule
            {registration.tier ? (
              <span className="ml-2 text-2xs font-medium uppercase text-ink-soft">
                {registration.tier}
              </span>
            ) : null}
          </h2>
          <ul className="mt-4 space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0"
              >
                <div className="w-28 shrink-0 text-xs text-ink-soft tabular-nums">
                  <span className="block text-ink">{formatTime(session.startTime)}</span>
                  <span>{formatDate(session.date)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{session.title}</p>
                  <p className="text-xs text-ink-soft">{session.location}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(() => {
        const life = eventLifecycle(event.status, event.schedule);
        const showFeedback =
          (life === "completed" || life === "ongoing") &&
          !["cancelled", "rejected"].includes(registration.status);
        if (!showFeedback) return null;
        return (
          <TicketFeedbackForm
            eventId={event.id}
            registrationId={registration.registrationId}
            alreadySubmitted={Boolean(registration.feedbackSubmitted)}
          />
        );
      })()}

      {hackathon && tracks.length ? (
        <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
          <h2 className="flex items-center gap-2 font-display text-base text-ink">
            <Flag className="h-4 w-4" aria-hidden="true" />
            Hackathon dashboard
          </h2>
          {hero === "confirmed" && teamAccessCode ? (
            <p className="mt-2 text-sm text-ink-soft">
              Your team access code is ready. Anyone on the team can use it at the enter page.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              Your team is registered. The organizer will share one team access code after approval
              and payment confirmation.
            </p>
          )}
          <p className="mt-4">
            <Link href={`/events/${event.id}/enter`} className={buttonClass("primary", "sm")}>
              Enter access code
            </Link>
          </p>
        </section>
      ) : null}

      <p className="mt-6 text-center text-xs text-ink-soft">
        Keep this link — it is the only way back to your ticket.
      </p>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-right text-ink">{value}</dd>
    </div>
  );
}
