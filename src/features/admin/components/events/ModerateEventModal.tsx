"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/src/components/ui/Modal";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import {
  moderateEventAction,
  undoUnpublishAction,
} from "@/src/features/admin/actions/events.action";
import {
  MODERATE_REASON_CHIPS,
  type AdminModerationEventRow,
} from "@/src/features/admin/eventModeration.types";
import { formatHostLine2 } from "@/src/features/admin/eventModeration.filters";

type Intent = "unpublish" | "restore" | "remove";

export function ModerateEventModal({
  open,
  row,
  canModerate,
  isOwner,
  onClose,
  onUnpublished,
}: {
  open: boolean;
  row: AdminModerationEventRow | null;
  canModerate: boolean;
  isOwner: boolean;
  onClose: () => void;
  onUnpublished?: (eventId: string) => void;
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>("unpublish");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasonId = useId();

  useEffect(() => {
    if (!open || !row) return;
    setReason("");
    setNotify(true);
    setConfirmTitle("");
    setError(null);
    setConfirmRemove(false);
    if (row.moderationUnpublished) setIntent("restore");
    else setIntent("unpublish");
  }, [open, row]);

  if (!row) return null;

  const host2 = formatHostLine2(row.host);
  const canSubmit =
    canModerate &&
    (intent !== "remove" || isOwner) &&
    (intent === "restore" || reason.trim().length >= 10);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await moderateEventAction({
        eventId: row.id,
        intent,
        reason: reason.trim() || (intent === "restore" ? "Restored by administrator" : ""),
        notifyOrganizer: notify,
        confirmTitle: intent === "remove" ? confirmTitle : undefined,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onClose();
      router.refresh();
      if (intent === "unpublish") onUnpublished?.(row.id);
    });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Moderate event"
        description="Unpublish hides the event from public listings and is reversible. Remove is permanent."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass(intent === "remove" ? "destructive" : "primary", "sm")}
              disabled={!canSubmit || pending}
              onClick={() => {
                if (intent === "remove") setConfirmRemove(true);
                else run();
              }}
            >
              {pending ? "Working…" : intent === "remove" ? "Remove…" : "Confirm"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <EventThumb
              title={row.title}
              src={row.bannerImage}
              size="wide"
              category={row.categoryLabel}
            />
            <div className="min-w-0">
              <p className="font-medium text-ink">{row.title}</p>
              <p className="text-sm text-ink-soft">{row.host.organizerName}</p>
              {host2 ? <p className="text-2xs text-ink-faint">{host2}</p> : null}
              <div className="mt-1">
                <StatusBadge
                  status={row.moderationUnpublished ? "unpublished" : row.status}
                  size="sm"
                />
              </div>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClass}>Action</legend>
            {(
              [
                {
                  value: "unpublish" as const,
                  title: "Unpublish",
                  body: "Hides from public listings and direct links; issued tickets keep working; reversible.",
                  show: !row.moderationUnpublished,
                },
                {
                  value: "restore" as const,
                  title: "Restore",
                  body: "Publish again after moderation unpublish.",
                  show: row.moderationUnpublished,
                },
                {
                  value: "remove" as const,
                  title: "Remove",
                  body: "Permanent. Owner only — type the event title to confirm.",
                  show: isOwner,
                },
              ] as const
            )
              .filter((o) => o.show)
              .map((o) => (
                <label
                  key={o.value}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                    intent === o.value
                      ? "border-ink bg-muted/40"
                      : "border-line hover:border-line-loud"
                  }`}
                >
                  <input
                    type="radio"
                    name="moderate-intent"
                    className="mt-1"
                    checked={intent === o.value}
                    onChange={() => setIntent(o.value)}
                    disabled={o.value !== "remove" && !canModerate}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{o.title}</span>
                    <span className="block text-2xs text-ink-soft">{o.body}</span>
                  </span>
                </label>
              ))}
          </fieldset>

          {intent !== "restore" ? (
            <div>
              <label className={labelClass} htmlFor={reasonId}>
                Reason
              </label>
              <textarea
                id={reasonId}
                className={`${fieldClass} min-h-[5rem]`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="At least 10 characters — logged against the event."
                required
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MODERATE_REASON_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-line px-2.5 py-0.5 text-2xs text-ink-soft hover:border-ink hover:text-ink"
                    onClick={() => setReason(chip === "Other" ? "" : chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {intent === "remove" ? (
            <div>
              <label className={labelClass} htmlFor="confirm-title">
                Type the event title to confirm
              </label>
              <input
                id="confirm-title"
                className={fieldClass}
                value={confirmTitle}
                onChange={(e) => setConfirmTitle(e.target.value)}
                placeholder={row.title}
                autoComplete="off"
              />
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify the organizer
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmRemove}
        title={`Remove "${row.title}"?`}
        description="This cancels the event permanently for attendees. You typed the title to confirm."
        confirmLabel="Remove event"
        tone="danger"
        busy={pending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          run();
        }}
      />
    </>
  );
}

/** Floating undo toast after unpublish (10s). */
export function UnpublishUndoToast({
  eventId,
  onDone,
}: {
  eventId: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(10);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!eventId) return;
    setLeft(10);
    const tick = window.setInterval(() => setLeft((n) => n - 1), 1000);
    const end = window.setTimeout(() => onDone(), 10_000);
    return () => {
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [eventId, onDone]);

  if (!eventId) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[110] flex items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-ink-invert shadow-lg"
    >
      <span>Event unpublished. Undo in {Math.max(0, left)}s</span>
      <button
        type="button"
        className="rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold text-ink disabled:opacity-50"
        disabled={pending || left <= 0}
        onClick={() => {
          startTransition(async () => {
            await undoUnpublishAction({ eventId });
            onDone();
            router.refresh();
          });
        }}
      >
        Undo
      </button>
    </div>
  );
}
