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
  // Wide bar (≈16:9) so the layout header is the only banner — not a tiny square thumb.
  const thumb =
    // eslint-disable-next-line @next/next/no-img-element
    video ? (
      <video
        src={src}
        muted
        className="aspect-video h-14 w-auto max-w-[11rem] rounded-lg object-cover sm:h-16 sm:max-w-[14rem]"
        suppressHydrationWarning
      />
    ) : (
      <img
        src={src}
        alt=""
        className="aspect-video h-14 w-auto max-w-[11rem] rounded-lg object-cover sm:h-16 sm:max-w-[14rem]"
        suppressHydrationWarning
      />
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
