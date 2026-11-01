import Link from "next/link";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";

/**
 * One footer for marketing, dashboards, and public inner pages.
 *
 * Compact stays minimal for dashboards. Full marketing footer carries product,
 * legal, contact, and Aroxes attribution.
 */
export function AppFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-5">
        <p className="text-sm text-ink-soft">
          © {year} Avoeline Event Systems. All rights reserved.
        </p>
        <Link href="/support" className="text-sm text-ink-soft transition hover:text-ink">
          Support
        </Link>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-xs">
            <Link href="/" className="mb-3 inline-flex items-center gap-2">
              <BrandMark className="h-7 w-7" />
              <span className="font-display text-lg tracking-tight text-ink">Avoeline</span>
            </Link>
            <p className="text-sm leading-relaxed text-ink-soft">
              Event operations for organizers and vendors — quotes, bookings, and analytics in one
              place.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            <FooterGroup
              title="Product"
              links={[
                { label: "Plans", href: "/plans" },
                { label: "Partners", href: "/partners" },
                { label: "About", href: "/about" },
                { label: "Events", href: "/events" },
              ]}
            />
            <FooterGroup
              title="Legal"
              links={[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
              ]}
            />
            <div>
              <p className="mb-3 text-2xs font-medium uppercase text-ink-soft">Contact</p>
              <ul className="flex flex-col gap-2">
                <li>
                  <a
                    href="mailto:info@aroxes.com"
                    className="text-sm text-ink-soft transition hover:text-ink"
                  >
                    info@aroxes.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://aroxes.com"
                    className="text-sm text-ink-soft transition hover:text-ink"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    An Aroxes company
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-sm text-ink-soft">
            © {year} Avoeline Event Systems. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-2xs font-medium uppercase text-ink-soft">{title}</p>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-ink-soft transition hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
