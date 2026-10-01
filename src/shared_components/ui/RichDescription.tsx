import { sanitizeDescriptionHtml } from "@/src/lib/sanitizeHtml";

export function RichDescription({ html, className = "" }: { html: string; className?: string }) {
  const safe = sanitizeDescriptionHtml(html);
  if (!safe) return null;
  return (
    <div
      className={`prose-event text-sm leading-relaxed text-ink-soft [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
