"use client";

import { useState } from "react";

export function SpeakerPhoto({
  src,
  alt,
  initials,
}: {
  src?: string;
  alt: string;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed;

  return (
    <div className="relative mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-line">
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true" className="text-xl font-semibold text-ink">
          {initials || "?"}
        </span>
      )}
    </div>
  );
}
