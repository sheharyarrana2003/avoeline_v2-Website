"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getFocusableElements, trapFocusKeyDown } from "./modalFocus";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const MAX_WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  className = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusable = getFocusableElements(root);
      (focusable[0] ?? root).focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (!dialogRef.current) return;
      trapFocusKeyDown(dialogRef.current, e, document.activeElement);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      data-modal-overlay="true"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/60 transition-opacity"
        data-modal-backdrop="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-line bg-paper opacity-100 shadow-lg transition-all ${MAX_WIDTH_CLASSES[maxWidth]} ${className}`.trim()}
        data-modal-panel="true"
      >
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between border-b border-line bg-paper px-6 py-5">
            <div className="space-y-1 pr-4">
              {title ? (
                <h3
                  id={titleId}
                  className="font-display text-lg font-semibold leading-none text-ink"
                >
                  {title}
                </h3>
              ) : null}
              {description ? (
                <p id={descriptionId} className="text-sm text-ink-soft">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-ink-soft transition hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-paper px-6 py-5">{children}</div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-line bg-paper px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
