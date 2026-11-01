import Image from "next/image";
import { RichDescription } from "@/src/shared_components/ui/RichDescription";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { VideoPreview } from "@/src/shared_components/ui/VideoPreview";
import { isVideoUrl } from "@/src/features/media/media.utils";
import type { PublicEventDto } from "@/src/features/events/types";

/** Allowlisted promo hosts (plus direct video files). */
function isAllowedPromoUrl(url: string): boolean {
  if (!url) return false;
  if (isVideoUrl(url)) return true;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "vimeo.com" ||
      host.endsWith(".youtube.com")
    );
  } catch {
    return false;
  }
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function PublicAbout({ dto }: { dto: PublicEventDto }) {
  const hasAbout = !!dto.description;
  const gallery = dto.galleryImages.filter(Boolean);
  const promo = dto.promoVideoUrl && isAllowedPromoUrl(dto.promoVideoUrl) ? dto.promoVideoUrl : "";

  if (!hasAbout && !gallery.length && !promo) return null;

  return (
    <section className="space-y-8">
      {hasAbout ? (
        <div>
          <h2 className="font-display text-lg text-ink">About this event</h2>
          <RichDescription html={dto.description} className="mt-3" />
        </div>
      ) : null}

      {promo ? (
        <div>
          <h2 className="font-display text-lg text-ink">Promo</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-muted">
            {isVideoUrl(promo) ? (
              <VideoPreview src={promo} title={dto.title} className="w-full">
                <video src={promo} muted className="aspect-video w-full object-cover" />
              </VideoPreview>
            ) : youtubeEmbed(promo) ? (
              <iframe
                title={`${dto.title} promo`}
                src={youtubeEmbed(promo)!}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a
                href={promo}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-6 text-sm font-medium text-ink underline"
              >
                Watch promo video
              </a>
            )}
          </div>
        </div>
      ) : null}

      {gallery.length ? (
        <div>
          <h2 className="font-display text-lg text-ink">Gallery</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((src) => (
              <li key={src}>
                <ImageLightbox src={src} alt="" className="block w-full">
                  <span className="relative block aspect-square overflow-hidden rounded-xl bg-muted">
                    <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
                  </span>
                </ImageLightbox>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
