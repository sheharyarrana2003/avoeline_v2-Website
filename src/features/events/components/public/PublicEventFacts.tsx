import { Calendar, Clock, MapPin, Ticket, Users, Wifi } from "lucide-react";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { isGoogleEmbedUrl, openInMapsHref } from "@/src/lib/mapsUrl";
import type { PublicEventDto } from "@/src/features/events/types";

export function PublicEventFacts({ dto }: { dto: PublicEventDto }) {
  const startDate = formatDateMedium(dto.schedule.startDate);
  const endDate = formatDateMedium(dto.schedule.endDate);
  const dateLabel =
    endDate && endDate !== startDate ? `${startDate} – ${endDate}` : startDate || "—";
  const timeLabel = [formatTime(dto.schedule.startTime), formatTime(dto.schedule.endTime)]
    .filter(Boolean)
    .join(" – ");
  const tz = dto.schedule.timezone || dto.timezone;
  const venue = [dto.location.venueName, dto.location.address, dto.location.city]
    .filter(Boolean)
    .join(", ");
  const regWindow = [
    dto.registrationOpenDate ? `Opens ${formatDateMedium(dto.registrationOpenDate)}` : null,
    dto.registrationCloseDate ? `Closes ${formatDateMedium(dto.registrationCloseDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const seatsLabel =
    dto.seats.left === null && dto.seats.total === 0
      ? "Unlimited"
      : dto.seats.left === null
        ? "—"
        : `${dto.seats.left} left${dto.seats.total ? ` of ${dto.seats.total}` : ""}`;
  const mapsHref = openInMapsHref(dto.location.mapsUrl);

  return (
    <section className="space-y-6">
      <h2 className="font-display text-lg text-ink">Event details</h2>
      <dl className="grid grid-cols-1 gap-5 border-y border-line py-6 sm:grid-cols-2">
        <Fact icon={<Calendar className="h-4 w-4" />} label="Date" value={dateLabel || "—"} />
        <Fact
          icon={<Clock className="h-4 w-4" />}
          label="Time"
          value={timeLabel ? `${timeLabel}${tz ? ` (${tz})` : ""}` : "—"}
        />
        <Fact icon={<MapPin className="h-4 w-4" />} label="Venue" value={venue || "—"} />
        <Fact
          icon={<Wifi className="h-4 w-4" />}
          label="Format"
          value={dto.schedule.formatLabel || dto.formatLabel || "—"}
        />
        <Fact icon={<Users className="h-4 w-4" />} label="Seats" value={seatsLabel} />
        <Fact icon={<Ticket className="h-4 w-4" />} label="Admission" value={dto.admissionLabel} />
        {regWindow ? (
          <Fact icon={<Calendar className="h-4 w-4" />} label="Registration" value={regWindow} />
        ) : null}
      </dl>

      {mapsHref ? (
        <div className="space-y-3">
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm font-semibold text-ink underline"
          >
            Open in Maps
          </a>
          {isGoogleEmbedUrl(mapsHref) ? (
            <iframe
              title="Venue map"
              src={mapsHref}
              className="h-48 w-full rounded-2xl border border-line"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-ink-soft" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
        {/* No truncate — full date/venue must remain readable */}
        <dd className="mt-0.5 text-sm text-ink">{value}</dd>
      </div>
    </div>
  );
}
