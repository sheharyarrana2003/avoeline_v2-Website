"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { absoluteShareUrl, buildShareMenuItems } from "./publicPage.logic";

export function PublicShareMenu({ sharePath, title }: { sharePath: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const url = absoluteShareUrl(sharePath);
  const items = buildShareMenuItems(url, title);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        Share
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute left-0 z-20 mt-2 min-w-[11rem] rounded-xl border border-line bg-paper py-1 shadow-md"
        >
          {items.map((item) => (
            <li key={item.id} role="none">
              {item.id === "copy" ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-muted"
                  onClick={() => void copy()}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : null}
                  {copied ? "Copied" : item.label}
                </button>
              ) : (
                <a
                  role="menuitem"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm text-ink hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
