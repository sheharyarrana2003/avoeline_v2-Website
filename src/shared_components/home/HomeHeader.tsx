import Link from "next/link";

// Pure server component — no interactivity needed
export function HomeHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(250,250,249,0.85)",
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
        {/* ── Logo ── */}
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
              background: "#6C5CE7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(108,92,231,0.35)",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
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
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { label: "Services", href: "#services" },
            { label: "How it works", href: "#how-it-works" },
          ].map((n) => (
            <Link key={n.label} href={n.href} className="home-nav-link" style={{ padding: "6px 14px", borderRadius: 8 }}>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* ── Auth CTAs ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Link href="/auth/signin" id="header-signin" className="btn-header-signin">
            Sign in
          </Link>
          <Link href="/auth/signup" id="header-get-started" className="btn-header-primary">
            Get started →
          </Link>
        </div>
      </div>
    </header>
  );
}
