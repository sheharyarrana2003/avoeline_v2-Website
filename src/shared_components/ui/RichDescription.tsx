import { sanitizeDescriptionHtml } from "@/src/lib/sanitizeHtml";

export function RichDescription({ html, className = "" }: { html: string; className?: string }) {
  const safe = sanitizeDescriptionHtml(html);
  if (!safe) return null;
  return (
    <div
      className={`prose-event text-sm leading-relaxed text-ink-soft [&_a]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:list-item ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
