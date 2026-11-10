"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MediaUpload } from "./MediaUpload";
import { isVideoUrl } from "./media.utils";
import type { UploadKind } from "@/src/features/files/uploadKinds";

interface MediaUploadFieldProps {
  /** Form field name; uploaded URL(s) are emitted as hidden input(s) with this name. */
  name: string;
  kind?: UploadKind;
  /** @deprecated Prefer `kind`. */
  folder?: string;
  accept?: string;
  multiple?: boolean;
  label?: string;
  bucket?: string;
  eventId?: string;
  buttonClassName?: string;
  /**
   * Media the form already has (edit flows). Rendered as removable thumbnails and
   * submitted alongside anything newly uploaded.
   */
  initialUrls?: string[];
}

/**
 * Drop-in uploader for plain forms: typed UploadKind → Supabase public media.
 */
export function MediaUploadField({
  name,
  kind,
  folder,
  accept = "image/*",
  multiple = false,
  label = "Upload",
  bucket,
  eventId,
  buttonClassName,
  initialUrls,
}: MediaUploadFieldProps) {
  const [urls, setUrls] = useState<string[]>(initialUrls ?? []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <MediaUpload
        kind={kind}
        folder={folder}
        accept={accept}
        multiple={multiple}
        bucket={bucket}
        eventId={eventId}
        label={label}
        buttonClassName={buttonClassName}
        className="shrink-0"
        value={!multiple ? (urls[0] ?? null) : null}
        onUploaded={(url) => setUrls((prev) => (multiple ? [...prev, url] : [url]))}
      />
      {urls.map((u, i) => (
        <div key={u + i} className="relative h-20 w-20 overflow-hidden rounded-xl group">
          {isVideoUrl(u) ? (
            <video src={u} muted className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => setUrls((prev) => prev.filter((_, idx) => idx !== i))}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-ink-invert transition hover:bg-ink"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ))}
      {urls.map((u, i) => (
        <input key={`hidden-${i}`} type="hidden" name={name} value={u} />
      ))}
    </div>
  );
}
