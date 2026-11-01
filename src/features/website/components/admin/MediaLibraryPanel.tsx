"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { updateSiteMediaMetaAction, uploadSiteMediaAction } from "../../actions/media.action";

export type MediaRow = {
  id: string;
  path: string;
  alt: string;
  tags: string[];
  mime: string | null;
  width: number | null;
  height: number | null;
  url: string;
};

export function MediaLibraryPanel({ items }: { items: MediaRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-line p-4">
        <h3 className="font-semibold text-ink">Upload</h3>
        <p className="text-sm text-ink-soft">
          Images only. Converted to WebP on the server. Alt text is required.
        </p>
        <div>
          <label className={labelClass}>File</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <label className={labelClass}>Alt text</label>
          <input className={fieldClass} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Tags (comma-separated)</label>
          <input className={fieldClass} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="button"
          className={buttonClass("primary", "md")}
          disabled={pending || !file || !alt.trim()}
          onClick={() =>
            startTransition(async () => {
              if (!file) return;
              const buf = await file.arrayBuffer();
              const bytes = new Uint8Array(buf);
              let binary = "";
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
              const base64 = btoa(binary);
              const res = await uploadSiteMediaAction({
                alt,
                tags,
                fileName: file.name,
                mime: file.type,
                base64,
              });
              if (!res.ok) setError(res.error.message);
              else {
                setError(null);
                setAlt("");
                setTags("");
                setFile(null);
                router.refresh();
              }
            })
          }
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No media yet"
          description="Upload an image to reuse across blocks."
          size="sm"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 rounded-2xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.alt} className="h-32 w-full rounded-xl object-cover" />
              <p className="truncate text-xs text-ink-soft">{item.path}</p>
              <input
                className={fieldClass}
                defaultValue={item.alt}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (!next || next === item.alt) return;
                  startTransition(async () => {
                    const res = await updateSiteMediaMetaAction({
                      id: item.id,
                      alt: next,
                      tags: item.tags.join(","),
                    });
                    if (!res.ok) setError(res.error.message);
                    else router.refresh();
                  });
                }}
              />
              <p className="text-xs text-ink-soft">
                {item.width ?? "?"}×{item.height ?? "?"} ·{" "}
                {(item.tags ?? []).join(", ") || "no tags"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
