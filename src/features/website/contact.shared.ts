/** Client-safe contact form constants and pure string helpers (no Node crypto). */

export const CONTACT_TOPICS = [
  "general",
  "sales",
  "support",
  "partnership",
  "press",
  "other",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General",
  sales: "Sales / plans",
  support: "Support",
  partnership: "Partnership",
  press: "Press",
  other: "Other",
};

/** Strip CR/LF (and other C0 controls) from header-ish fields to block injection. */
export function sanitizeContactHeader(value: string): string {
  return String(value ?? "")
    .replace(/[\r\n\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Honeypot `website` must be empty/absent. Filled → treat as bot. */
export function isContactHoneypotTripped(website: string | null | undefined): boolean {
  return Boolean(String(website ?? "").trim());
}

/**
 * Lightweight spam heuristic for storage (0 = clean).
 * Does not block; honeypot/rate-limit/Turnstile do that.
 */
export function scoreContactSpam(input: {
  honeypotTripped: boolean;
  message: string;
  name: string;
}): number {
  let score = 0;
  if (input.honeypotTripped) score += 1;
  const message = input.message.trim();
  if (message.length < 10) score += 0.2;
  const urlMatches = message.match(/https?:\/\//gi);
  if (urlMatches && urlMatches.length >= 3) score += 0.3;
  if (/viagra|crypto\s*invest|nigerian\s*prince/i.test(message)) score += 0.5;
  if (!sanitizeContactHeader(input.name)) score += 0.2;
  return Math.min(1, Math.round(score * 100) / 100);
}

export function buildContactNotifySubject(topic: string, name: string): string {
  const safeTopic = sanitizeContactHeader(topic) || "general";
  const safeName = sanitizeContactHeader(name) || "visitor";
  return `Contact: ${safeTopic} — ${safeName}`;
}

export function buildContactNotifyText(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): string {
  return [
    `New contact form submission`,
    ``,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Topic: ${input.topic}`,
    ``,
    input.message,
  ].join("\n");
}

export function buildContactAutoReplyText(name: string): string {
  const who = sanitizeContactHeader(name) || "there";
  return [
    `Hi ${who},`,
    ``,
    `Thanks for contacting Avoeline. We received your message and will reply soon.`,
    ``,
    `— Avoeline`,
    `info@aroxes.com`,
  ].join("\n");
}
