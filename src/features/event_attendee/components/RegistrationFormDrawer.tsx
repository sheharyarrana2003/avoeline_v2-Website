"use client";

import { useState, type ReactNode } from "react";
import { FileText, X } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

/**
 * O2: Registration form builder lives on Attendees (drawer), not Access.
 */
export function RegistrationFormDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={() => setOpen(true)}
      >
        <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Registration form
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close registration form"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-paper shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="font-display text-lg text-ink">Registration form</h2>
                <p className="text-xs text-ink-soft">
                  Questions attendees answer when they register. Saved to this event.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-ink-soft hover:bg-muted hover:text-ink"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
