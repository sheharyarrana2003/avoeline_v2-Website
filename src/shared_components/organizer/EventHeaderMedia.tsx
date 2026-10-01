"use client";

import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { VideoPreview } from "@/src/shared_components/ui/VideoPreview";
import { isVideoUrl } from "@/src/features/media/media.utils";

export function EventHeaderMedia({
  banner,
  gallery,
  title,
}: {
  banner?: string | null;
  gallery?: string[];
  title: string;
}) {
  const src = String(banner || "").trim() || String(gallery?.[0] || "").trim();
  if (!src) return null;
  const video = isVideoUrl(src);
  const thumb = (
    // eslint-disable-next-line @next/next/no-img-element
    video ? (
      <video src={src} muted className="h-16 w-24 rounded-lg object-cover" />
    ) : (
      <img src={src} alt="" className="h-16 w-24 rounded-lg object-cover" />
    )
  );
  if (video) {
    return (
      <VideoPreview src={src} title={title} className="shrink-0">
        {thumb}
      </VideoPreview>
    );
  }
  return (
    <ImageLightbox src={src} alt={title} className="shrink-0">
      {thumb}
    </ImageLightbox>
  );
}
