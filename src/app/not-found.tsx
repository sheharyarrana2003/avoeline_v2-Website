import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/plans", label: "Plans" },
  { href: "/about", label: "About" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
  { href: "/events", label: "Events" },
] as const;

export default function RootNotFound() {
  return (
    <div className="marketing-shell flex min-h-full flex-1 flex-col bg-canvas">
      <header className="border-b border-line/80 bg-paper/80">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2.5 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-lg tracking-tight text-ink">Avoeline</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-start justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-ink-invert">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
          That link does not lead anywhere. It may have been moved, or the address may have a typo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            Back to home
          </Link>
          <Link href="/contact" className={buttonClass("secondary", "md")}>
            Contact
          </Link>
        </div>
        <nav aria-label="Marketing pages" className="mt-10">
          <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-ink-soft">Explore</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-ink-soft transition hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
