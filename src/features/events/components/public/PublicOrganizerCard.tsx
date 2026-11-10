import type { PublicEventDto } from "@/src/features/events/types";

export function PublicOrganizerCard({ dto }: { dto: PublicEventDto }) {
  const { name, logoUrl } = dto.organizerChip;
  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-display text-lg text-ink">Organizer</h2>
      <div className="mt-3 flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-display text-lg text-ink">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="text-base font-medium text-ink">{name}</p>
      </div>
    </section>
  );
}
