import { BrandMark } from "@/src/shared_components/ui/BrandMark";
// Server Component — minimal, clean home page footer
import Link from "next/link";

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 32,
          }}
        >
          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {/* Logo mark stays black here — footer is a quiet, monochrome
                  zone; the one purple mark already lives in the header */}
              <BrandMark className="h-6 w-6 shrink-0" />
              Avoeline
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                color: "var(--ink-soft)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              The event management platform built for organizers and vendors
              who mean business.
            </p>
          </div>

          {/* Link groups */}
          <div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                Platform
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "For Organizers", href: "/auth/signup" },
                  { label: "For Vendors", href: "/auth/signup" },
                  { label: "Sign in", href: "/auth/signin" },
                ].map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.875rem",
                      color: "var(--ink-soft)",
                      textDecoration: "none",
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                Legal
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* /privacy, /terms and /help have never existed, so all three
                    404'd from the public footer. Support is the one that does
                    exist; the other two come back when the pages do. */}
                {[
                  { label: "Support", href: "/support" },
                ].map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.875rem",
                      color: "var(--ink-soft)",
                      textDecoration: "none",
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.8rem",
              color: "var(--ink-soft)",
              margin: 0,
            }}
          >
            © {year} Avoeline Event Systems. All rights reserved.
          </p>
          {/* Status dot stays green — it's a functional signal, not decoration */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--success)",
                display: "block",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                color: "var(--ink-soft)",
              }}
            >
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}