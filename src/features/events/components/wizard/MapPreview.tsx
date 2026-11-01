"use client";

import { isGoogleEmbedUrl, isValidMapsUrl, openInMapsHref } from "@/src/lib/mapsUrl";

export function MapPreview({ mapUrl }: { mapUrl: string }) {
  const href = openInMapsHref(mapUrl);
  if (!href) {
    const raw = String(mapUrl || "").trim();
    if (raw && !isValidMapsUrl(raw)) {
      return (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line bg-muted px-4 text-center text-sm text-ink-soft">
          Use an https:// link (Google Maps share link works best).
        </div>
      );
    }
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line bg-muted text-sm text-ink-soft">
        Paste a Google Maps share link to preview or open the venue.
      </div>
    );
  }
  if (isGoogleEmbedUrl(href)) {
    return (
      <div className="overflow-hidden rounded-xl border border-line">
        <iframe title="Venue map preview" src={href} className="h-48 w-full border-0" />
        <div className="border-t border-line bg-paper px-3 py-2 text-right">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-ink underline"
          >
            Open in Maps
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-muted px-4 text-center">
      <p className="text-sm text-ink-soft">
        Link saved. Embed preview is only available for Google Maps embed URLs.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-ink underline"
      >
        Open in Maps
      </a>
    </div>
  );
}
