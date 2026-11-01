"use client";

import { useState, useTransition } from "react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { submitDataRequestAction } from "../actions/dataRequest.action";

export function DataRequestForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<"access" | "deletion">("access");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  if (done) {
    return (
      <p className="rounded-2xl border border-line bg-paper p-4 text-sm text-ink">
        Your request was submitted. Our team will follow up by email. You can track progress once
        staff open a support ticket under Data requests.
      </p>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await submitDataRequestAction({
            name,
            email,
            requestType,
            message,
            website,
          });
          if (!res.ok) setError(res.error.message);
          else {
            setError(null);
            setDone(true);
          }
        });
      }}
    >
      <h3 className="font-semibold text-ink">Request access or deletion</h3>
      <p className="text-sm text-ink-soft">
        Submit a privacy request. This creates a ticket for the platform owner — it does not export
        attendee lists.
      </p>
      {/* honeypot */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />
      <div>
        <label className={labelClass} htmlFor="dsar-name">
          Name
        </label>
        <input
          id="dsar-name"
          className={fieldClass}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="dsar-email">
          Email
        </label>
        <input
          id="dsar-email"
          type="email"
          className={fieldClass}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="dsar-type">
          Request type
        </label>
        <select
          id="dsar-type"
          className={fieldClass}
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as "access" | "deletion")}
        >
          <option value="access">Access my data</option>
          <option value="deletion">Delete my data</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="dsar-message">
          Details (optional)
        </label>
        <textarea
          id="dsar-message"
          className={`${fieldClass} min-h-24`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className={buttonClass("primary", "md")} disabled={pending}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
