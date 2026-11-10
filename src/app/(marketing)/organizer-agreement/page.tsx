import type { Metadata } from "next";
import { getLegalDocument } from "@/src/features/website/marketingData.service";
import { buildPageMetadata } from "@/src/features/website/pageMetadata";
import { LegalDocumentView } from "@/src/features/website/components/LegalDocumentView";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getLegalDocument("organizer-agreement");
  return buildPageMetadata(
    { title: doc ? `${doc.title} — Avoeline` : "Event Organizer Agreement — Avoeline" },
    {
      title: "Event Organizer Agreement — Avoeline",
      description: "Agreement for organizers publishing events on Avoeline.",
      path: "/organizer-agreement",
    },
  );
}

export default async function OrganizerAgreementPage() {
  const doc = await getLegalDocument("organizer-agreement");

  if (!doc) {
    return (
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl tracking-tight text-[var(--mkt-ink)]">
          Event Organizer Agreement
        </h1>
        <p className="mt-4 text-sm text-[var(--mkt-muted)]">
          The current organizer agreement will appear here once published. Contact{" "}
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
