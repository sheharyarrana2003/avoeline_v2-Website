import Image from "next/image";
import type { PublicSpeaker } from "@/src/features/events/types";

export function PublicSpeakers({ speakers }: { speakers: PublicSpeaker[] }) {
  if (!speakers.length) return null;

  return (
    <section className="space-y-6">
      <h2 className="font-display text-lg text-ink">Speakers</h2>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {speakers.map((s) => (
          <li key={s.id} className="flex gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
              {s.photoUrl ? (
                <Image src={s.photoUrl} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-lg text-ink-faint">
                  {s.name.slice(0, 1) || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-base text-ink">{s.name}</p>
              {s.title ? <p className="text-sm text-ink-soft">{s.title}</p> : null}
              {s.bio ? <p className="mt-1 line-clamp-4 text-sm text-ink-soft">{s.bio}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
