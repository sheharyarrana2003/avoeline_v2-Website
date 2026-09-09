import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import Link from "next/link";

// Pure server component — no interactivity needed
export function HomeHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid #E8E7E4",
      }}
    >
      {/* Inline styles cannot express a media query, so the responsive part of
          this row is Tailwind: at 375px the fixed 32px padding plus the section
          nav pushed the two buttons 200px off the right edge of the screen. */}
      <div
        className="mx-auto flex h-[68px] items-center justify-between gap-3 px-4 sm:gap-6 sm:px-8"
        style={{ maxWidth: 1200 }}
      >
        {/* ── Logo — the one place purple lives in the header ── */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <BrandMark className="h-8 w-8 shrink-0" />
          <span
            style={{
              fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
              fontWeight: 700,
              fontSize: "1.2rem",
              color: "#14141A",
              letterSpacing: "-0.01em",
            }}
          >
            Avoeline
          </span>
        </Link>

        {/* ── Nav ── */}
        {/* Anchor links into the page below; the page itself scrolls to them,
            so on a phone the buttons are the better use of the space. */}
        <nav className="hidden items-center gap-1 sm:flex">
          {[
            { label: "Services", href: "#services" },
            { label: "How it works", href: "#how-it-works" },
          ].map((n) => (
            <Link
              key={n.label}
              href={n.href}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#14141A",
                textDecoration: "none",
              }}
              className="home-nav-link"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* ── Auth CTAs — black/white, no purple ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Link
            href="/auth/signin"
            id="header-signin"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#14141A",
              padding: "9px 16px",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            id="header-get-started"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#FFFFFF",
              background: "#14141A",
              padding: "9px 18px",
              borderRadius: 100,
              textDecoration: "none",
            }}
          >
            Get started →
          </Link>
        </div>
      </div>
    </header>
  );
}