"use client";

import { useActionState, useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { DateField } from "@/src/shared_components/DateField";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { addGuests } from "../actions/guestList.action";
import { parseGuestList, type GuestListReport } from "../types";

const SAMPLE_WHITELIST = "email,name\nguest@example.com,Alex Guest\n";
const SAMPLE_INVITE = "email,name,tier\nguest@example.com,Alex Guest,VIP\n";

export function GuestListPanel({
  eventId,
  kinds = ["whitelist", "invite"],
}: {
  eventId: string;
  /** Which add modes this access type allows. */
  kinds?: Array<"whitelist" | "invite">;
}) {
  const allowed: Array<"whitelist" | "invite"> = kinds.length ? [...kinds] : ["whitelist"];
  const [state, formAction] = useActionState<ActionResult | null, FormData>(addGuests, null);
  const [kind, setKind] = useState<"whitelist" | "invite">(
    allowed.includes("invite") && !allowed.includes("whitelist") ? "invite" : "whitelist",
  );
  const [paste, setPaste] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [preview, setPreview] = useState<GuestListReport | null>(null);

  const effectiveKind = allowed.includes(kind) ? kind : allowed[0];
  const combined = useMemo(() => `${paste}\n${fileText}`.trim(), [paste, fileText]);

  const runPreview = (raw: string) => {
    if (!raw.trim()) {
      setPreview(null);
      return;
    }
    setPreview(parseGuestList(raw));
  };

  const downloadSample = () => {
    const csv = effectiveKind === "invite" ? SAMPLE_INVITE : SAMPLE_WHITELIST;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = effectiveKind === "invite" ? "invite-sample.csv" : "whitelist-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="eventId" value={eventId} />

      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Everyone on that list was added." /> : null}

      {allowed.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="guest-kind" className={labelClass}>
            Add as
          </label>
          <select
            id="guest-kind"
            name="kind"
            value={effectiveKind}
            onChange={(e) => setKind(e.target.value as "whitelist" | "invite")}
            className={fieldClass}
          >
            {allowed.includes("whitelist") ? (
              <option value="whitelist">Whitelist — these addresses may register</option>
            ) : null}
            {allowed.includes("invite") ? (
              <option value="invite">Invite — each person gets their own trackable link</option>
            ) : null}
          </select>
        </div>
      ) : (
        <input type="hidden" name="kind" value={effectiveKind} />
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="guests" className={labelClass}>
            Addresses
          </label>
          <button
            type="button"
            onClick={downloadSample}
            className={`${buttonClass("ghost", "sm")} inline-flex items-center gap-1`}
          >
            <Download size={12} aria-hidden />
            Sample CSV
          </button>
        </div>
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
          One per line. Optionally{" "}
          <code>{effectiveKind === "invite" ? "email, name, tier" : "email, name"}</code>. A header
          row is ignored.
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

      {effectiveKind === "invite" ? (
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

      <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
        <p className="text-xs font-medium uppercase text-ink-soft">Email message (optional)</p>
        <p className="text-xs text-ink-soft">
          Sent from your connected Gmail when &quot;Email each person&quot; is checked. Leave blank
          for the default; your text is added above the register link.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mail-subject" className={labelClass}>
            Subject
          </label>
          <input
            id="mail-subject"
            name="mailSubject"
            className={fieldClass}
            placeholder={
              effectiveKind === "invite" ? "You are invited to …" : "You are on the list for …"
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mail-body" className={labelClass}>
            Opening lines
          </label>
          <textarea
            id="mail-body"
            name="mailBody"
            rows={3}
            className={`${fieldClass} resize-none text-sm`}
            placeholder="Hi — we’d love to have you. The link below is yours."
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="notify"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-current"
        />
        <span>
          {effectiveKind === "invite"
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
          {effectiveKind === "invite" ? "Create invites" : "Add to whitelist"}
        </SubmitButton>
      </div>
    </form>
  );
}
