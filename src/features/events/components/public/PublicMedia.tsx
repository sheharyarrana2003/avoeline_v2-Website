"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { VideoPreview } from "@/src/shared_components/ui/VideoPreview";
import { isVideoUrl } from "@/src/features/media/media.utils";
import type { PublicEventDto } from "@/src/features/events/types";
import { buildPublicMediaItems } from "./publicPage.logic";

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
      host.endsWith(".youtube.com") ||
      host.endsWith(".vimeo.com")
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

function vimeoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

export function PublicMedia({ dto }: { dto: PublicEventDto }) {
  const items = buildPublicMediaItems(dto);
  const promo = dto.promoVideoUrl && isAllowedPromoUrl(dto.promoVideoUrl) ? dto.promoVideoUrl : "";
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" && items.length) {
        setLightbox((i) => (i == null ? 0 : (i + 1) % items.length));
      }
      if (e.key === "ArrowLeft" && items.length) {
        setLightbox((i) => (i == null ? 0 : (i - 1 + items.length) % items.length));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, items.length]);

  if (!items.length && !promo) return null;

  const yt = promo ? youtubeEmbed(promo) : null;
  const vim = promo && !yt ? vimeoEmbed(promo) : null;

  return (
    <section className="space-y-6">
      <h2 className="font-display text-lg text-ink">Media</h2>

      {promo ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-muted">
          {isVideoUrl(promo) ? (
            <VideoPreview src={promo} title={dto.title} className="w-full">
              <video src={promo} muted className="aspect-video w-full object-cover" />
            </VideoPreview>
          ) : yt || vim ? (
            <iframe
              title={`${dto.title} promo`}
              src={(yt || vim)!}
              loading="lazy"
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
      ) : null}

      {items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.src}`}>
              <button
                type="button"
                className="relative block aspect-square w-full overflow-hidden rounded-xl bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                onClick={() => setLightbox(index)}
                aria-label={`Open image ${index + 1}`}
              >
                <Image
                  src={item.src}
                  alt={item.kind === "banner" ? `${dto.title} banner` : `${dto.title} gallery`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox != null && items[lightbox] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg border border-white/30 bg-ink/50 px-3 py-1.5 text-sm text-white"
            onClick={() => setLightbox(null)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[lightbox].src}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
