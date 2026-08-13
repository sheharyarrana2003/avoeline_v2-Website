"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, TriangleAlert } from "lucide-react";
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
  "relative flex h-28 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line-loud bg-canvas text-ink-soft transition hover:border-ink disabled:opacity-60";

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
            <ImageUp className="h-6 w-6" aria-hidden="true" />
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
      {error && (
        <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
