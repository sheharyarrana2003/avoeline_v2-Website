import type { Metadata } from "next";
import { getLegalDocument } from "@/src/features/website/marketingData.service";
import { buildPageMetadata } from "@/src/features/website/pageMetadata";
import { LegalDocumentView } from "@/src/features/website/components/LegalDocumentView";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getLegalDocument("content-rights");
  return buildPageMetadata(
    { title: doc ? `${doc.title} — Avoeline` : "Content Rights — Avoeline" },
    {
      title: "Content Rights — Avoeline",
      description: "Content rights statement for event organizers on Avoeline.",
      path: "/content-rights",
    },
  );
}

export default async function ContentRightsPage() {
  const doc = await getLegalDocument("content-rights");

  if (!doc) {
    return (
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl tracking-tight text-[var(--mkt-ink)]">
          Content Rights
        </h1>
        <p className="mt-4 text-sm text-[var(--mkt-muted)]">
          The current content-rights statement will appear here once published. Contact{" "}
          <a href="mailto:info@aroxes.com" className="underline">
            info@aroxes.com
          </a>{" "}
          with questions.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <LegalDocumentView doc={doc} />
    </main>
  );
}
