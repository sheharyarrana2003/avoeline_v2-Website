import ReactMarkdown from "react-markdown";
import { prepareLegalMarkdown } from "../legalMarkdown";
import type { LegalDocumentView as LegalDoc } from "../marketingData.service";

export function LegalDocumentView({ doc }: { doc: LegalDoc }) {
  const { body, toc } = prepareLegalMarkdown(doc.bodyMd);
  const updated = doc.effectiveDate || doc.publishedAt.slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 gap-10 px-4 py-12 sm:px-6 lg:px-8">
      {toc.length > 0 ? (
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label="Table of contents" className="sticky top-24">
            <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-[var(--mkt-muted)]">
              On this page
            </p>
            <ul className="space-y-2 border-l border-[var(--mkt-line)] pl-3">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-sm text-[var(--mkt-muted)] transition hover:text-[var(--mkt-ink)]"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      ) : null}

      <article className="min-w-0 flex-1 print:max-w-none">
        <header className="mb-8 border-b border-[var(--mkt-line)] pb-6">
          <h1 className="font-display text-3xl tracking-tight text-[var(--mkt-ink)] sm:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-3 text-sm text-[var(--mkt-muted)]">
            Version {doc.version}
            {updated ? ` · Last updated ${updated}` : null}
          </p>
        </header>

        <div className="prose-marketing max-w-3xl space-y-4 text-base leading-relaxed text-[var(--mkt-text)]">
          <ReactMarkdown
            skipHtml
            components={{
              h2: ({ children }) => {
                const text = String(children ?? "");
                const match = toc.find((t) => t.text === text);
                const id = match?.id ?? text.toLowerCase().replace(/\s+/g, "-");
                return (
                  <h2
                    id={id}
                    className="scroll-mt-28 pt-4 font-display text-2xl tracking-tight text-[var(--mkt-ink)]"
                  >
                    {children}
                  </h2>
                );
              },
              a: ({ href, children }) => {
                const safe = href && !/^javascript:/i.test(href) ? href : "#";
                return (
                  <a href={safe} className="underline underline-offset-2" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              },
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
