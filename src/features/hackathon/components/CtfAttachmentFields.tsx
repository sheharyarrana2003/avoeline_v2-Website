"use client";

import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

function CtfFilePick({
  id,
  name,
  label,
  helper,
  maxBytes,
  maxAttachmentMb,
}: {
  id: string;
  name: string;
  label: string;
  helper?: string;
  maxBytes: number;
  maxAttachmentMb: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.size > maxBytes) {
      window.alert(`"${file.name}" is larger than ${maxAttachmentMb}MB.`);
      e.target.value = "";
      setFileName("");
      return;
    }
    setFileName(file?.name ?? "");
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        className="sr-only"
        onChange={onChange}
      />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-3.5 w-3.5" />
          {fileName ? "Replace file" : "Choose file"}
        </button>
        {fileName ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2 py-0.5 text-xs text-ink">
            {fileName}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-paper"
              aria-label="Remove file"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = "";
                setFileName("");
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : (
          <span className="text-xs text-ink-faint">No file chosen</span>
        )}
      </div>
      {helper ? <p className="mt-1 text-xs text-ink-soft">{helper}</p> : null}
    </div>
  );
}

export function CtfAttachmentFields({
  prefix,
  maxAttachmentMb,
}: {
  prefix: string;
  maxAttachmentMb: number;
}) {
  const [hints, setHints] = useState([{ text: "" }]);
  const maxBytes = maxAttachmentMb * 1024 * 1024;

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-line p-3">
      <CtfFilePick
        id={`${prefix}-challenge`}
        name="challengeFile"
        label="Challenge file"
        helper={`Any format. Max ${maxAttachmentMb}MB. Flag values stay server-side.`}
        maxBytes={maxBytes}
        maxAttachmentMb={maxAttachmentMb}
      />
      {hints.map((_, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor={`${prefix}-hint-${i}`} className={labelClass}>
              Hint {i + 1}
            </label>
            <input id={`${prefix}-hint-${i}`} name="hintText" className={fieldClass} />
          </div>
          <CtfFilePick
            id={`${prefix}-hintfile-${i}`}
            name="hintFile"
            label="Hint file (optional)"
            maxBytes={maxBytes}
            maxAttachmentMb={maxAttachmentMb}
          />
        </div>
      ))}
      <button
        type="button"
        className="text-xs font-medium text-ink hover:underline"
        onClick={() => setHints((h) => [...h, { text: "" }])}
      >
        Add another hint
      </button>
    </div>
  );
}
