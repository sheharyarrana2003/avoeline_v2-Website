import { RichDescription } from "@/src/shared_components/ui/RichDescription";
import type { PublicEventDto } from "@/src/features/events/types";

/** Description only — gallery and promo live in PublicMedia. */
export function PublicAbout({ dto }: { dto: PublicEventDto }) {
  if (!dto.description) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg text-ink">About this event</h2>
      <RichDescription html={dto.description} className="mt-1 break-words" />
    </section>
  );
}
