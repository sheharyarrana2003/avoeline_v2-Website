"use client";

import { useState } from "react";
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
}: MediaUploadFieldProps) {
  const [urls, setUrls] = useState<string[]>([]);

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
              className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-black/70 text-[10px] leading-none text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}
      {urls.map((u, i) => (
        <input key={`hidden-${i}`} type="hidden" name={name} value={u} />
      ))}
    </div>
  );
}
