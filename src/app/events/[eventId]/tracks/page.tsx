import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Flag, Lock } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import {
  eventIsHackathon,
  listPrizesForTracks,
  listTeamsOfEvent,
  listTracks,
} from "@/src/features/hackathon/hackathon.service";
import { trackSponsor } from "@/src/features/hackathon/types";
import { publicEventPresentation, trackRegistrationOpen } from "@/src/lib/publicEventStatus";

export const metadata = { title: "Tracks — Avoeline" };

/**
 * The public track listing for a hackathon (spec 3.1).
 *
 * Behind module 2's access gate rather than a second rule of its own: a private
 * event's tracks are as private as the event. When the gate refuses, this points
 * at the event page, which owns the code form -- duplicating that form here
 * would be a second place for the gate to drift.
 */
export default async function PublicTracksPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ code?: string; invite?: string }>;
}) {
  const { eventId } = await params;
  const { code, invite } = await searchParams;

  const { event, access } = await getEventForVisitor(eventId, {
    code: code ?? null,
    token: invite ?? null,
  });
  if (!event || !(await eventIsHackathon(event))) notFound();

  const qs = [
    code ? `code=${encodeURIComponent(code)}` : "",
    invite ? `invite=${encodeURIComponent(invite)}` : "",
  ]
    .filter(Boolean)
    .join("&");
  const qsSuffix = qs ? `?${qs}` : "";
  const eventHref = `/events/${eventId}${qsSuffix}`;

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
                  Open the event page and enter the access code to see its tracks.
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
  const canRegisterEvent = presentation.registrationOpen;

  const [tracks, teams, orgs] = await Promise.all([
    listTracks(eventId),
    listTeamsOfEvent(eventId),
    getEventOrganizations(eventId),
  ]);
  const prizesByTrack = await listPrizesForTracks(tracks.map((t) => t.id));

  const teamsByTrack = new Map<string, number>();
  for (const team of teams)
    teamsByTrack.set(team.trackId, (teamsByTrack.get(team.trackId) ?? 0) + 1);

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

      <h1 className="font-display text-2xl text-ink">{event.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {tracks.length
          ? "Pick a competition, then form a team once you have registered."
          : "Competitions for this hackathon."}
      </p>
      <p className="mt-4 flex flex-wrap gap-2">
        {canRegisterEvent ? (
          <Link href={eventHref} className={buttonClass("secondary", "sm")}>
            Register for this event
          </Link>
        ) : (
          <span className="inline-flex items-center rounded-lg border border-line bg-muted px-3 py-1.5 text-xs font-medium text-ink-soft">
            Registration closed
          </span>
        )}
      </p>

      {tracks.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<Flag className="h-5 w-5" />}
            title="No competitions announced yet"
            description="The organiser has not opened any competitions. Register for the event and you will be able to enter one when they do."
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {await Promise.all(
            tracks.map(async (track) => {
              const sponsor = trackSponsor(orgs, track.id);
              const rulesUrl = track.rulesPath
                ? await getSignedUrl(
                    CERTIFICATES_BUCKET,
                    track.rulesPath,
                    3600,
                    track.rulesName || "rules.pdf",
                  ).catch(() => "")
                : "";
              const count = teamsByTrack.get(track.id) ?? 0;
              const open = trackRegistrationOpen(track, {
                eventRegistrationOpen: canRegisterEvent,
              });
              const detailHref = `/events/${eventId}/tracks/${track.id}${qsSuffix}`;
              return (
                <Card key={track.id} className="overflow-hidden">
                  <Link href={detailHref} className="block">
                    <div className="relative aspect-[4/5] w-full bg-muted">
                      {track.imageUrl ? (
                        <Image
                          src={track.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-display text-3xl text-ink-faint">
                          {track.name.slice(0, 1) || "?"}
                        </span>
                      )}
                    </div>
                  </Link>
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={detailHref}
                        className="font-display text-lg text-ink hover:underline"
                      >
                        {track.name}
                      </Link>
                      <span className="text-2xs font-medium uppercase text-ink-soft">
                        {open ? "Open" : "Closed"}
                      </span>
                    </div>
                    {!open ? (
                      <p className="mt-1 text-sm font-medium text-ink">
                        This competition is not accepting registration.
                      </p>
                    ) : null}
                    {track.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{track.description}</p>
                    ) : null}

                    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4">
                      <Fact label="Teams of" value={`${track.minTeamSize}–${track.maxTeamSize}`} />
                      <Fact
                        label="Entry"
                        value={track.fee > 0 ? formatCurrency(track.fee, track.currency) : "Free"}
                      />
                      <Fact
                        label="Registration closes"
                        value={
                          track.registrationClosesAt ? formatDate(track.registrationClosesAt) : "—"
                        }
                      />
                      <Fact label="Teams so far" value={`${count}`} />
                    </dl>

                    {(prizesByTrack.get(track.id) ?? []).length ? (
                      <ul className="mt-4 space-y-1 text-sm text-ink">
                        {(prizesByTrack.get(track.id) ?? []).map((p) => (
                          <li key={p.id}>
                            <span className="font-medium">{p.positionLabel}</span>
                            {p.amount ? ` · ${p.amount}` : ""}
                            {p.description ? ` — ${p.description}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {track.prizePool ? (
                      <p className="mt-2 text-sm text-ink-soft">{track.prizePool}</p>
                    ) : null}

                    <p className="mt-4 flex flex-wrap gap-2">
                      <Link href={detailHref} className={buttonClass("secondary", "sm")}>
                        View details
                      </Link>
                    </p>

                    {(sponsor || rulesUrl) && (
                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-soft">
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
                  </CardBody>
                </Card>
              );
            }),
          )}
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
