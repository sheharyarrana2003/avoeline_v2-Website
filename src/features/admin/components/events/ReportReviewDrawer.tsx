"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { dismissReportsAction } from "@/src/features/admin/actions/events.action";
import type { EventReportRow, FlaggedEventRow } from "@/src/features/admin/eventModeration.types";
import { formatHostLine2 } from "@/src/features/admin/eventModeration.filters";
import { listEventReportsForDrawer } from "@/src/features/admin/actions/eventReports.read.action";

function maskEmail(email: string): string {
  const e = email.trim();
  const at = e.indexOf("@");
  if (at < 1) return e ? "•••" : "anonymous";
  const local = e.slice(0, at);
  const domain = e.slice(at);
  return `${local[0]}***${domain}`;
}

export function ReportReviewDrawer({
  open,
  flagged,
  canModerate,
  onClose,
  onModerate,
  onChanged,
}: {
  open: boolean;
  flagged: FlaggedEventRow | null;
  canModerate: boolean;
  onClose: () => void;
  onModerate: () => void;
  onChanged: () => void;
}) {
  const [reports, setReports] = useState<EventReportRow[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !flagged) return;
    setNote("");
    setError(null);
    startTransition(async () => {
      const rows = await listEventReportsForDrawer(flagged.eventId);
      setReports(rows);
    });
  }, [open, flagged]);

  if (!open || !flagged) return null;

  const host2 = formatHostLine2(flagged.host);
  const openReports = reports.filter((r) => r.status === "open");

  const dismiss = (reportIds?: string[], dismissAll?: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await dismissReportsAction({
        eventId: flagged.eventId,
        reportIds,
        dismissAll,
        adminNote: note.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onChanged();
      if (dismissAll) onClose();
      else {
        const rows = await listEventReportsForDrawer(flagged.eventId);
        setReports(rows);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-paper shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">Review reports</h2>
            <p className="text-2xs text-ink-faint">Open reports for this event</p>
          </div>
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <EventThumb
            title={flagged.title}
            src={flagged.bannerImage}
            size="wide"
            category={flagged.categoryLabel}
            subtitle={[flagged.categoryLabel, flagged.format].filter(Boolean).join(" · ") || null}
          />
          <p className="text-sm text-ink-soft">{flagged.host.organizerName}</p>
          {host2 ? <p className="text-2xs text-ink-faint">{host2}</p> : null}
          <Link
            href={`/e/${flagged.eventId}`}
            className="text-sm font-medium text-ink underline"
            target="_blank"
          >
            Preview public page
          </Link>

          <ul className="divide-y divide-line rounded-xl border border-line">
            {reports.map((r) => (
              <li key={r.id} className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={r.status} size="sm" />
                  <span className="text-2xs text-ink-faint">{formatDateMedium(r.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{r.reason}</p>
                <p className="text-2xs text-ink-faint">{maskEmail(r.reporterEmail)}</p>
                {r.status === "open" && canModerate ? (
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => dismiss([r.id])}
                  >
                    Dismiss
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {canModerate && openReports.length ? (
            <div className="space-y-2">
              <label className={labelClass} htmlFor="dismiss-note">
                Note (optional)
              </label>
              <textarea
                id="dismiss-note"
                className={`${fieldClass} min-h-[3.5rem]`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why these reports are being dismissed"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        {canModerate ? (
          <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
            {openReports.length ? (
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                disabled={pending}
                onClick={() => dismiss(undefined, true)}
              >
                Dismiss all
              </button>
            ) : null}
            <button type="button" className={buttonClass("primary", "sm")} onClick={onModerate}>
              Moderate event
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
