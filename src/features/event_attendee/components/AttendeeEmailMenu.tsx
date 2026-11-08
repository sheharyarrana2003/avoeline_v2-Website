"use client";

import { useState, type ReactNode } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

/**
 * O2 toolbar: one Email control that reveals registration + bulk send actions.
 * Children stay mounted so nested Modals survive menu close.
 */
export function AttendeeEmailMenu({
  connectionBanner,
  children,
}: {
  connectionBanner?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Email
        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" aria-hidden />
      </button>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default"
          aria-label="Close email menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        role="menu"
        hidden={!open}
        className={`absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-line bg-paper p-3 shadow-lg ${
          open ? "" : "pointer-events-none"
        }`}
      >
        {connectionBanner ? <div className="mb-3">{connectionBanner}</div> : null}
        <div className="flex flex-col gap-2" onClick={() => setOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
}
