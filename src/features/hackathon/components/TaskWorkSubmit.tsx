"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass } from "@/src/lib/ui";
import { requestTaskSubmissionUpload } from "../actions/taskSubmissions.action";

export function TaskWorkSubmit({
  action,
  eventId,
  taskId,
  linkRequired,
  returnTo,
}: {
  action: (formData: FormData) => Promise<void>;
  eventId: string;
  taskId: string;
  linkRequired: boolean;
  returnTo: string;
}) {
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="filePath" value={filePath} />
      <textarea name="textAnswer" rows={2} className={fieldClass} placeholder="Text answer" />
      <input
        name="linkUrl"
        className={fieldClass}
        placeholder={linkRequired ? "https://… (required)" : "https://… (optional)"}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          className="text-xs text-ink-soft"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) {
              setFilePath("");
              setFileName("");
              return;
            }
            setFileError("");
            start(async () => {
              const res = await requestTaskSubmissionUpload({
                eventId,
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
                fileSize: file.size,
              });
              if (!res.ok) {
                setFileError(res.error.message);
                return;
              }
              const put = await fetch(res.data.signedUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
              });
              if (!put.ok) {
                setFileError("Upload failed. Try again.");
                return;
              }
              setFilePath(res.data.path);
              setFileName(file.name);
            });
          }}
        />
        {fileName ? <span className="text-xs text-ink-soft">Ready: {fileName}</span> : null}
      </div>
      {fileError ? <p className="text-xs text-danger">{fileError}</p> : null}
      <SubmitButton className={buttonClass("secondary", "sm")} disabled={pending}>
        Submit work
      </SubmitButton>
    </form>
  );
}
