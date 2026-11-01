"use client";

import { useActionState, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { DateField } from "@/src/shared_components/DateField";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { addGuests } from "../actions/guestList.action";
import { parseGuestList, type GuestListReport } from "../types";

export function GuestListPanel({ eventId }: { eventId: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(addGuests, null);
  const [kind, setKind] = useState<"whitelist" | "invite">("whitelist");
  const [paste, setPaste] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [preview, setPreview] = useState<GuestListReport | null>(null);

  const combined = useMemo(() => `${paste}\n${fileText}`.trim(), [paste, fileText]);

  const runPreview = (raw: string) => {
    if (!raw.trim()) {
      setPreview(null);
      return;
    }
    setPreview(parseGuestList(raw));
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="eventId" value={eventId} />

      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Everyone on that list was added." /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-kind" className={labelClass}>
          Add as
        </label>
        <select
          id="guest-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as "whitelist" | "invite")}
          className={fieldClass}
        >
          <option value="whitelist">Whitelist — these addresses may register</option>
          <option value="invite">Invite — each person gets their own trackable link</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="guests" className={labelClass}>
          Addresses
        </label>
        <textarea
          id="guests"
          name="guests"
          rows={6}
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            setPreview(null);
          }}
          className={`${fieldClass} resize-none font-mono text-xs`}
        />
        <p className="text-xs text-ink-soft">
          One per line. Optionally <code>email, name, tier</code>. A header row is ignored.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-file" className={labelClass}>
          Or upload a CSV <span className="normal-case text-ink-faint">(optional)</span>
        </label>
        <input
          id="guest-file"
          name="file"
          type="file"
          accept=".csv,text/csv,text/plain"
          className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:text-ink`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) {
              setFileName("");
              setFileText("");
              setPreview(null);
              return;
            }
            const text = await file.text();
            setFileName(file.name);
            setFileText(text);
            setPreview(null);
          }}
        />
        {fileName ? <p className="text-xs text-ink-soft">Selected file: {fileName}</p> : null}
      </div>

      {kind === "invite" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expiresAt" className={labelClass}>
              Expires <span className="normal-case text-ink-faint">(optional)</span>
            </label>
            <DateField id="expiresAt" name="expiresAt" className={fieldClass} />
            <p className="text-xs text-ink-soft">The link stops working at the end of this day.</p>
          </div>
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input type="checkbox" name="singleUse" className="mt-0.5 h-4 w-4 accent-current" />
            <span>Single use — the link stops working once they register</span>
          </label>
        </div>
      ) : null}

      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="notify"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-current"
        />
        <span>
          {kind === "invite"
            ? "Email each person their unique link now"
            : "Email each person that they are on the whitelist"}
        </span>
      </label>

      {preview ? (
        <div className="space-y-2 rounded-xl border border-line p-4 text-sm">
          <p className="font-medium text-ink">
            {preview.valid.length} valid · {preview.duplicates.length} duplicate skipped ·{" "}
            {preview.invalid.length} invalid — won&apos;t be added
          </p>
          {preview.duplicates.length ? (
            <p className="text-xs text-ink-soft">Duplicates: {preview.duplicates.join(", ")}</p>
          ) : null}
          {preview.invalid.length ? (
            <ul className="text-xs text-ink-soft">
              {preview.invalid.slice(0, 12).map((row) => (
                <li key={`${row.line}-${row.value}`}>
                  Line {row.line}: {row.value}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => runPreview(combined)}
        >
          Preview list
        </button>
        <SubmitButton
          pendingText="Adding…"
          className={buttonClass("primary")}
          disabled={!preview || preview.valid.length === 0}
        >
          <Upload size={14} aria-hidden="true" />
          {kind === "invite" ? "Create invites" : "Add to whitelist"}
        </SubmitButton>
      </div>
    </form>
  );
}
