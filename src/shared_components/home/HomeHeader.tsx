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
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 32px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
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
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 16 16" fill="none">
              <path d="M3 12L8 4L13 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 9.5H10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
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
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
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