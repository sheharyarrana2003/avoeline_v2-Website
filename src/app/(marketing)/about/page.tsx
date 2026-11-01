import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";
import { getPublishedPage } from "@/src/features/website/siteContent.service";
import { buildPageMetadata } from "@/src/features/website/pageMetadata";
import { MarketingPageBlocks } from "@/src/features/website/components/MarketingPageBlocks";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("about");
  return buildPageMetadata(page?.seo, {
    title: "About — Avoeline",
    description:
      "Avoeline is built by Aroxes for organizers, clubs, and vendors who run real events.",
    path: "/about",
  });
}

function AboutFallback() {
  return (
    <main className="flex-1">
      <section className="ink-panel on-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="font-display text-4xl tracking-tight text-white sm:text-5xl">
            About Avoeline
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
            Avoeline is built by Aroxes, a group of companies making practical software for local
            businesses and people.
          </p>
        </div>
      </section>
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-display text-2xl text-[var(--mkt-ink)]">From Aroxes</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            <li className="rounded-2xl border border-[var(--mkt-line)] p-6">
              <p className="font-display text-lg text-[var(--mkt-ink)]">Avoeline</p>
              <p className="mt-2 text-sm text-[var(--mkt-muted)]">
                Event operations for organizers and vendors.
              </p>
            </li>
            <li className="rounded-2xl border border-[var(--mkt-line)] p-6">
              <p className="font-display text-lg text-[var(--mkt-ink)]">Distroline</p>
              <p className="mt-2 text-sm text-[var(--mkt-muted)]">
                Practical software from the Aroxes family.
              </p>
            </li>
          </ul>
          <Link href="/contact" className={`${buttonClass("primary", "md")} mt-10 inline-flex`}>
            Get in touch
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function AboutPage() {
  const page = await getPublishedPage("about");
  if (!page) return <AboutFallback />;

  return (
    <main className="flex-1">
      <MarketingPageBlocks slug="about" />
    </main>
  );
}
