import type { Metadata } from "next";
import { getLegalDocument } from "@/src/features/website/marketingData.service";
import { buildPageMetadata } from "@/src/features/website/pageMetadata";
import { LegalDocumentView } from "@/src/features/website/components/LegalDocumentView";
import { DataRequestForm } from "@/src/features/website/components/DataRequestForm";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getLegalDocument("privacy");
  return buildPageMetadata(
    { title: doc ? `${doc.title} — Avoeline` : "Privacy Policy — Avoeline" },
    {
      title: "Privacy Policy — Avoeline",
      description: "How Avoeline collects and uses data.",
      path: "/privacy",
    },
  );
}

export default async function PrivacyPage() {
  const doc = await getLegalDocument("privacy");

  if (!doc) {
    return (
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl tracking-tight text-[var(--mkt-ink)]">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-[var(--mkt-muted)]">
          The current privacy policy will appear here once published. Contact{" "}
          <a href="mailto:info@aroxes.com" className="underline">
            info@aroxes.com
          </a>{" "}
          with questions.
        </p>
        <div className="mt-10 max-w-lg">
          <DataRequestForm />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <LegalDocumentView doc={doc} />
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg">
          <DataRequestForm />
        </div>
      </div>
    </main>
  );
}
