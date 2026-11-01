"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitContactAction } from "@/src/features/website/actions/contact.action";
import {
  CONTACT_TOPICS,
  CONTACT_TOPIC_LABELS,
  type ContactTopic,
} from "@/src/features/website/contact.shared";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

type Props = {
  turnstileSiteKey?: string | null;
  /** Prefill topic from `?topic=` (unknown values fall back to general). */
  initialTopic?: string | null;
};

function resolveTopic(raw: string | null | undefined): ContactTopic {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (t === "enterprise" || t === "plan" || t === "plans") return "sales";
  if (t === "partner" || t === "partners") return "partnership";
  if ((CONTACT_TOPICS as readonly string[]).includes(t)) return t as ContactTopic;
  return "general";
}

export function ContactForm({ turnstileSiteKey, initialTopic }: Props) {
  const siteKey = turnstileSiteKey?.trim() || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(() => resolveTopic(initialTopic));
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const widgetHost = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !widgetHost.current) return;

    let cancelled = false;

    function mountWidget() {
      if (cancelled || !widgetHost.current || !window.turnstile) return;
      if (widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
      widgetId.current = window.turnstile.render(widgetHost.current, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(undefined),
        "error-callback": () => setTurnstileToken(undefined),
        theme: "light",
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );

    if (window.turnstile) {
      mountWidget();
    } else if (existing) {
      existing.addEventListener("load", mountWidget);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", mountWidget);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (done) {
    return (
      <div className="rounded-2xl border border-[var(--mkt-line)] bg-white/60 p-6" role="status">
        <h2 className="font-display text-xl text-[var(--mkt-ink)]">Message sent</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--mkt-muted)]">
          Thanks — we received your note and will reply soon at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <form
      className="relative space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await submitContactAction({
            name,
            email,
            topic,
            message,
            website,
            turnstileToken,
          });
          if (!res.ok) {
            setError(res.error.message);
            if (widgetId.current && window.turnstile) {
              window.turnstile.reset(widgetId.current);
              setTurnstileToken(undefined);
            }
            return;
          }
          setDone(true);
        });
      }}
      noValidate
    >
      {/* Honeypot — hidden from users, visible to naive bots */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contact-name" className={labelClass}>
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          className={`${fieldClass} mt-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className={labelClass}>
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          className={`${fieldClass} mt-1`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contact-topic" className={labelClass}>
          Topic
        </label>
        <select
          id="contact-topic"
          name="topic"
          className={`${fieldClass} mt-1`}
          value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>
              {CONTACT_TOPIC_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={5000}
          className={`${fieldClass} mt-1`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {siteKey ? <div ref={widgetHost} className="min-h-[65px]" /> : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
