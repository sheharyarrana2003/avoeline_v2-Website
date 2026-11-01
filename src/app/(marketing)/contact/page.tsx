import type { Metadata } from "next";
import { getPublishedPage } from "@/src/features/website/siteContent.service";
import { buildPageMetadata } from "@/src/features/website/pageMetadata";
import { MarketingPageBlocks } from "@/src/features/website/components/MarketingPageBlocks";
import { ContactForm } from "@/src/features/website/components/ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("contact");
  return buildPageMetadata(page?.seo, {
    title: "Contact — Avoeline",
    description: "Reach Avoeline at info@aroxes.com or send a message.",
    path: "/contact",
  });
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string }>;
}) {
  const page = await getPublishedPage("contact");
  const params = searchParams ? await searchParams : {};
  const topic = typeof params.topic === "string" ? params.topic : "";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  return (
    <main className="flex-1">
      <section className="ink-panel on-ink px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="font-display text-4xl tracking-tight text-white sm:text-5xl">Contact</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
            Email{" "}
            <a href="mailto:info@aroxes.com" className="text-white underline underline-offset-2">
              info@aroxes.com
            </a>
            . We usually reply within one business day.
          </p>
        </div>
      </section>

      {page ? <MarketingPageBlocks slug="contact" /> : null}

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <ContactForm turnstileSiteKey={turnstileSiteKey} initialTopic={topic || null} />
        </div>
      </section>
    </main>
  );
}
