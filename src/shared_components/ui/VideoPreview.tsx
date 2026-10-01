"use client";

import { useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

export function VideoPreview({
  src,
  title,
  children,
  className = "",
}: {
  src: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    setOpen(true);
    ref.current?.showModal();
  }

  function hide() {
    ref.current?.close();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={`Play ${title}`}
        className={`group/zoom relative block cursor-pointer overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      >
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/zoom:opacity-100 group-focus-visible/zoom:opacity-100"
        >
          <Maximize2 size={14} />
        </span>
      </button>
      <dialog
        ref={ref}
        onCancel={(e) => {
          e.preventDefault();
          hide();
        }}
        onClick={(e) => {
          if (e.target === ref.current) hide();
        }}
        className="on-ink m-auto max-h-[92vh] w-fit max-w-[min(72rem,calc(100vw-2rem))] bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        {open ? (
          <figure className="relative m-0 flex max-h-[92vh] w-fit flex-col">
            <video src={src} controls autoPlay className="max-h-[86vh] w-auto max-w-full rounded-2xl" />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-white">
              <span className="min-w-0 truncate">{title}</span>
              <button
                type="button"
                onClick={hide}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
              >
                <X size={14} aria-hidden="true" />
                Close
              </button>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </>
  );
}
