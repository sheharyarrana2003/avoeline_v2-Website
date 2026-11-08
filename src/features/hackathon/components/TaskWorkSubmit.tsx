"use client";

import { useState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export function TaskWorkSubmit({
  action,
  trackId,
  taskId,
  linkRequired,
  returnTo,
  brief,
  attachmentUrl,
  attachmentLabel,
  maxAttachmentMb = 10,
}: {
  action: (formData: FormData) => Promise<void>;
  eventId: string;
  trackId: string;
  taskId: string;
  linkRequired: boolean;
  returnTo: string;
  brief?: string;
  attachmentUrl?: string | null;
  attachmentLabel?: string | null;
  maxAttachmentMb?: number;
}) {
  const [linkCount, setLinkCount] = useState(1);
  const [fileName, setFileName] = useState("");

  return (
    <form action={action} className="mt-3 space-y-2" encType="multipart/form-data">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="trackId" value={trackId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {brief ? (
        <div className="rounded-lg border border-line bg-muted/40 p-2 text-sm text-ink-soft">
          <p className="text-2xs font-semibold uppercase text-ink-faint">From organizers</p>
          <p className="whitespace-pre-wrap text-ink">{brief}</p>
          {attachmentUrl ? (
            <p className="mt-2">
              <a
                href={attachmentUrl}
                className="font-medium text-ink underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {attachmentLabel || "Attachment"}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      <textarea
        name="textAnswer"
        rows={2}
        className={fieldClass}
        placeholder="Details / text answer"
      />
      <textarea
        name="organizerNotes"
        rows={2}
        className={fieldClass}
        placeholder="Note to organizers (optional)"
      />
      {Array.from({ length: linkCount }, (_, i) => (
        <input
          key={i}
          name={i === 0 ? "linkUrl" : "linkUrls"}
          className={fieldClass}
          placeholder={
            i === 0
              ? linkRequired
                ? "https://… (required)"
                : "https://… (optional)"
              : `https://… (link ${i + 1})`
          }
          required={i === 0 && linkRequired}
        />
      ))}
      {linkCount < 5 ? (
        <button
          type="button"
          className={buttonClass("ghost", "sm")}
          onClick={() => setLinkCount((n) => Math.min(5, n + 1))}
        >
          Add another link
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="artifact"
          className="text-xs text-ink-soft"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.png,.jpg,.jpeg,.gif,.txt,.md,application/pdf,application/zip,image/*,text/*,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
        />
        {fileName ? <span className="text-xs text-ink-soft">Ready: {fileName}</span> : null}
      </div>
      <p className="text-2xs text-ink-faint">
        Presentations allowed. Max {maxAttachmentMb}MB. Submitted time is recorded to the second.
      </p>
      <SubmitButton className={buttonClass("secondary", "sm")}>Submit work</SubmitButton>
    </form>
  );
}
