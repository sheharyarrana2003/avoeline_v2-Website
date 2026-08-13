"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MediaUpload } from "./MediaUpload";
import { isVideoUrl } from "./media.utils";

interface MediaUploadFieldProps {
  /** Form field name; uploaded URL(s) are emitted as hidden input(s) with this name. */
  name: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
  label?: string;
  bucket?: string;
  buttonClassName?: string;
  /**
   * Media the form already has (edit flows). Rendered as removable thumbnails and
   * submitted alongside anything newly uploaded, so an edit that touches nothing
   * else preserves the existing URLs instead of clearing them.
   */
  initialUrls?: string[];
}

/**
 * Drop-in uploader for plain (server-action) forms: uploads to Supabase and
 * exposes the resulting URL(s) as hidden inputs so they submit with the form.
 */
export function MediaUploadField({
  name,
  folder,
  accept = "image/*",
  multiple = false,
  label = "Upload",
  bucket,
  buttonClassName,
  initialUrls,
}: MediaUploadFieldProps) {
  const [urls, setUrls] = useState<string[]>(initialUrls ?? []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <MediaUpload
        folder={folder}
        accept={accept}
        multiple={multiple}
        bucket={bucket}
        label={label}
        buttonClassName={buttonClassName}
        className="shrink-0"
        value={!multiple ? urls[0] ?? null : null}
        onUploaded={(url) => setUrls((prev) => (multiple ? [...prev, url] : [url]))}
      />
      {multiple &&
        urls.map((u, i) => (
          <div key={u + i} className="relative h-20 w-20 overflow-hidden rounded-xl group">
            {isVideoUrl(u) ? (
              <video src={u} muted className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u} alt={`upload ${i + 1}`} className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-ink-invert transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
