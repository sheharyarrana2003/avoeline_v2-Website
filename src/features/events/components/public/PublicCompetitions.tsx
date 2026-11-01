import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import { HACKATHON_KIND_LABELS } from "@/src/features/hackathon/kinds";
import type { PublicCompetition } from "@/src/features/events/types";

export function PublicCompetitions({
  eventId,
  competitions,
  qsSuffix = "",
}: {
  eventId: string;
  competitions: PublicCompetition[];
  qsSuffix?: string;
}) {
  if (!competitions.length) return null;

  return (
    <section className="space-y-6 border-t border-line pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Competitions</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {competitions.length} competition{competitions.length === 1 ? "" : "s"}, each with its
            own team size, deadline and prizes.
          </p>
        </div>
        <Link
          href={`/events/${eventId}/tracks${qsSuffix}`}
          className={buttonClass("secondary", "sm")}
        >
          See all
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {competitions.map((track) => {
          const href = `/events/${eventId}/tracks/${track.id}${qsSuffix}`;
          return (
            <li key={track.id}>
              <Link
                href={href}
                className="group block overflow-hidden rounded-2xl border border-line bg-paper transition hover:border-line-loud focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="relative aspect-[4/5] w-full bg-muted">
                  {track.imageUrl ? (
                    <Image
                      src={track.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-3xl text-ink-faint">
                      {track.name.slice(0, 1) || "?"}
                    </span>
                  )}
                  {track.sponsorLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.sponsorLogoUrl}
                      alt={track.sponsorName || "Sponsor"}
                      className="absolute bottom-3 right-3 h-10 w-auto max-w-[40%] rounded-lg bg-white/90 object-contain p-1 shadow-sm"
                    />
                  ) : null}
                </div>
                <div className="space-y-1.5 p-4">
                  <h3 className="font-display text-base text-ink">{track.name}</h3>
                  <p className="text-2xs font-medium uppercase text-ink-soft">
                    {HACKATHON_KIND_LABELS[track.kind]} · teams of {track.minTeamSize}–
                    {track.maxTeamSize}
                  </p>
                  {track.description ? (
                    <p className="line-clamp-2 text-sm text-ink-soft">{track.description}</p>
                  ) : null}
                  <p className="text-sm tabular-nums text-ink">
                    {track.due > 0 ? formatCurrency(track.due, track.currency, "Free") : "Free"}
                    {track.prizePool ? ` · ${track.prizePool}` : ""}
                  </p>
                  <p className="text-2xs font-medium uppercase text-ink-soft">
                    {track.registrationOpen ? "Open for registration" : "Registration closed"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
