"use client";

import { useRef, useState, useTransition } from "react";
import { uploadMedia } from "./uploadMedia.action";
import { isVideoUrl } from "./media.utils";

interface MediaUploadProps {
  /** Storage folder/prefix, e.g. "banners", "gallery", "speaker-avatars". */
  folder: string;
  /** Called with the resulting URL after each successful upload. */
  onUploaded: (url: string) => void;
  /** Accept attribute; defaults to images. */
  accept?: string;
  /** Allow selecting/uploading multiple files (fires onUploaded per file). */
  multiple?: boolean;
  /** Target bucket; defaults to the public "media" bucket. */
  bucket?: string;
  /** Optional current single-image URL to preview. */
  value?: string | null;
  /** Optional label shown in the dropzone. */
  label?: string;
  className?: string;
  /** Override the dropzone button styling (e.g. a small square tile). */
  buttonClassName?: string;
}

const DEFAULT_BUTTON =
  "relative flex h-28 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-gray-400 disabled:opacity-60";

// Keep in step with uploadMedia.action MAX_BYTES and next.config proxyClientMaxBodySize.
// Guarding here avoids a raw 500 ("Unexpected end of form") when the body would be
// truncated by the proxy layer before the server action can validate size.
const MAX_BYTES = 50 * 1024 * 1024;

export function MediaUpload({
  folder,
  onUploaded,
  accept = "image/*",
  multiple = false,
  bucket,
  value,
  label = "Upload",
  className = "",
  buttonClassName = DEFAULT_BUTTON,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value ?? null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const tooBig = Array.from(files).find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is too large (max 50MB).`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        if (bucket) fd.append("bucket", bucket);
        const res = await uploadMedia(fd);
        if (res.success) {
          if (!multiple) setPreview(res.url);
          onUploaded(res.url);
        } else {
          setError(res.error);
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        aria-busy={isPending}
        className={buttonClassName}
      >
        {preview && !multiple ? (
          isVideoUrl(preview) ? (
            <video src={preview} muted className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <>
            <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">{isPending ? "Uploading…" : label}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">⚠️ {error}</p>}
    </div>
  );
}
