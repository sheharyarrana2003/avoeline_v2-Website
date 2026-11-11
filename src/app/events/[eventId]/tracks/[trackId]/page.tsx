import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Download, Lock } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { formatDate, formatDateMedium } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { absoluteUrl } from "@/src/lib/appUrl";
import { accessUnlockCookieName } from "@/src/features/access/lib/accessUnlock";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import {
  eventIsHackathon,
  getTrack,
  listPrizesForTracks,
  listTeams,
} from "@/src/features/hackathon/hackathon.service";
import { trackDueAmount, trackSponsor } from "@/src/features/hackathon/types";
import { publicEventPresentation, trackRegistrationOpen } from "@/src/lib/publicEventStatus";
import { PublicShareMenu } from "@/src/features/events/components/public/PublicShareMenu";
import { RichDescription } from "@/src/shared_components/ui/RichDescription";

export const metadata = { title: "Competition — Avoeline" };

/**
 * Public competition (track) detail. Access follows the parent event gate.
 * Register CTA is gated by event lifecycle + registration dates + track
 * `registration_closes_at` / ended status.
 */
export default async function PublicTrackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; trackId: string }>;
  searchParams: Promise<{ code?: string; invite?: string }>;
}) {
  const { eventId, trackId } = await params;
  const { code, invite } = await searchParams;
  const jar = await cookies();
  const unlockToken = jar.get(accessUnlockCookieName(eventId))?.value ?? null;

  const { event, access } = await getEventForVisitor(eventId, {
    code: code ?? null,
    token: invite ?? null,
    unlockToken,
  });
  if (!event || !(await eventIsHackathon(event))) notFound();

  const track = await getTrack(trackId);
  if (!track || track.eventId !== eventId) notFound();

  const qs = [invite ? `invite=${encodeURIComponent(invite)}` : ""].filter(Boolean).join("&");
  const qsSuffix = qs ? `?${qs}` : "";
  const eventHref = `/events/${eventId}${qsSuffix}`;
  const registerJoin = qsSuffix.includes("?") ? "&" : "?";
  const registerHref = `${eventHref}${registerJoin}track=${encodeURIComponent(trackId)}#register`;

  if (!access.allowed) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
        <Card tone="raised">
          <CardBody>
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-ink"
              >
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-lg text-ink">This event is private</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  Open the event page and enter the access code to see this competition.
                </p>
              </div>
            </div>
            <p className="mt-6">
              <Link href={eventHref} className={buttonClass("primary", "sm")}>
                Go to the event
              </Link>
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const presentation = publicEventPresentation(event.status, event.schedule, event.registration);
  const trackOpen = trackRegistrationOpen(track, {
    eventRegistrationOpen: presentation.registrationOpen,
  });
  const canRegister = presentation.registrationOpen && trackOpen;

  const [orgs, prizesByTrack, teams, shareUrl, rulesUrl] = await Promise.all([
    getEventOrganizations(eventId),
    listPrizesForTracks([track.id]),
    listTeams(track.id),
    absoluteUrl(`/events/${eventId}/tracks/${track.id}`),
    track.rulesPath
      ? getSignedUrl(
          CERTIFICATES_BUCKET,
          track.rulesPath,
          3600,
          track.rulesName || "rules.pdf",
        ).catch(() => "")
      : Promise.resolve(""),
  ]);

  const sponsor = trackSponsor(orgs, track.id);
  const prizes = prizesByTrack.get(track.id) ?? [];
  const due = trackDueAmount(track);
  const entryLabel = due > 0 ? formatCurrency(due, track.currency) : "Free";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <BrandMark className="h-7 w-7" />
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
          Avoeline
        </span>
      </Link>

      <p className="text-sm text-ink-soft">
        <Link href={eventHref} className="font-medium text-ink hover:underline">
          {event.title}
        </Link>
        {" · "}
        <Link href={`/events/${eventId}/tracks${qsSuffix}`} className="hover:underline">
          Competitions
        </Link>
      </p>

      <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted">
          {track.imageUrl ? (
            <Image src={track.imageUrl} alt="" fill sizes="224px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-4xl text-ink-faint">
              {track.name.slice(0, 1) || "?"}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-2xl text-ink sm:text-3xl">{track.name}</h1>
          {track.description ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{track.description}</p>
          ) : null}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-3">
            <Fact label="Teams of" value={`${track.minTeamSize}–${track.maxTeamSize}`} />
            <Fact label="Entry" value={entryLabel} />
            <Fact label="Teams so far" value={`${teams.length}`} />
            <Fact
              label="Registration closes"
              value={
                track.registrationClosesAt ? formatDateMedium(track.registrationClosesAt) : "—"
              }
            />
            <Fact label="Status" value={trackOpen ? "Open" : "Closed"} />
          </dl>

          <div className="mt-6 space-y-3">
            <PublicShareMenu sharePath={shareUrl} title={track.name} />
            {canRegister ? (
              <Link href={registerHref} className={buttonClass("primary")}>
                Register for this event
              </Link>
            ) : (
              <p className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-ink-soft">
                {!presentation.registrationOpen
                  ? "Registration is closed for this event."
                  : "Registration for this competition has closed."}
              </p>
            )}
          </div>
        </div>
      </div>

      {prizes.length ? (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-lg text-ink">Prizes</h2>
          <ul className="mt-3 space-y-1 text-sm text-ink">
            {prizes.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.positionLabel}</span>
                {p.amount ? ` · ${p.amount}` : ""}
                {p.description ? ` — ${p.description}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {track.prizePool ? <p className="mt-4 text-sm text-ink-soft">{track.prizePool}</p> : null}

      {track.rulesText ? (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-lg text-ink">Rules</h2>
          {/<[a-z][\s\S]*>/i.test(track.rulesText) ? (
            <RichDescription html={track.rulesText} className="mt-3" />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {track.rulesText}
            </p>
          )}
        </section>
      ) : null}

      {track.instructions ? (
        <section className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-lg text-ink">Instructions</h2>
          {/<[a-z][\s\S]*>/i.test(track.instructions) ? (
            <RichDescription html={track.instructions} className="mt-3" />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {track.instructions}
            </p>
          )}
        </section>
      ) : null}

      {(sponsor || rulesUrl) && (
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-soft">
          {sponsor ? <span>Sponsored by {sponsor.name}</span> : null}
          {rulesUrl ? (
            <a
              href={rulesUrl}
              className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
            >
              <Download size={13} aria-hidden="true" />
              {track.rulesName || "Rules and problem statement"}
            </a>
          ) : null}
        </div>
      )}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
