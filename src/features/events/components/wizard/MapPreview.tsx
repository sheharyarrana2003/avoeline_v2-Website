"use client";

import { osmEmbedFromMapUrl } from "./wizardUtils";

export function MapPreview({ mapUrl }: { mapUrl: string }) {
  const embed = osmEmbedFromMapUrl(mapUrl);
  const href = String(mapUrl || "").trim();
  if (!href) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-line bg-muted text-sm text-ink-soft">
        Paste a Google Maps or OpenStreetMap share link to preview the venue.
      </div>
    );
  }
  if (!embed) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-muted px-4 text-center">
        <p className="text-sm text-ink-soft">This link cannot be embedded. Open it in a new tab to confirm the pin.</p>
        <a href={href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-ink underline">
          Open map
        </a>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <iframe title="Venue map preview" src={embed} className="h-48 w-full border-0" />
      <div className="border-t border-line bg-paper px-3 py-2 text-right">
        <a href={href} target="_blank" rel="noreferrer" className="text-xs font-medium text-ink underline">
          Open map
        </a>
      </div>
    </div>
  );
}
