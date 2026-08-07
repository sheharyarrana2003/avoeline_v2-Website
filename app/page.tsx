import Link from "next/link";
import { HomeHeader } from "@/src/shared_components/home/HomeHeader";
import { HomeFooter } from "@/src/shared_components/home/HomeFooter";
import { AnalyticsCardMockup } from "@/src/shared_components/home/AnalyticsCardMockup";

// ─── Static data ─────────────────────────────────────────────────────────────

const services = [
  {
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Event Planning",
    desc: "Create and manage events end-to-end — agendas, timelines, guests, and more.",
  },
  {
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Vendor Network",
    desc: "Discover, quote, and book from a curated network of trusted vendors.",
  },
  {
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Live Analytics",
    desc: "Track revenue, attendance, and growth in real-time from one dashboard.",
  },
  {
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: "Smart Quotes",
    desc: "Vendors respond with itemised proposals you can compare and accept in one click.",
  },
  {
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Booking Management",
    desc: "All bookings, confirmations, and schedules in one unified timeline view.",
  },
  {
    icon: (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    title: "Notifications",
    desc: "Stay on top of every update — vendor replies, confirmations, and alerts.",
  },
];

const steps = [
  { num: "01", role: "Organizer", title: "Create your event", desc: "Set up your event with details, agenda, and requirements in minutes." },
  { num: "02", role: "Organizer", title: "Request vendor quotes", desc: "Browse and request quotes from verified vendors in your area." },
  { num: "03", role: "Vendor", title: "Submit a proposal", desc: "Vendors receive requests and respond with itemised, competitive quotes." },
  { num: "04", role: "Both", title: "Track & analyse", desc: "Monitor in real-time — revenue, attendance, and vendor performance." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <HomeHeader />

      <main style={{ flex: 1 }}>

        {/* ════════════════════ HERO — solid black ════════════════════ */}
        <section
          style={{
            background: "#0A0A0C",
            padding: "100px 32px 100px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 80,
              flexWrap: "wrap",
            }}
          >
            {/* Left copy */}
            <div style={{ flex: "1 1 440px", maxWidth: 580 }}>

              {/* Badge */}
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 100, padding: "6px 16px", marginBottom: 28,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8B7CF6", display: "block" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                  Event management, reimagined
                </span>
              </div>

              {/* Headline */}
              <h1
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 3.75rem)",
                  fontWeight: 700,
                  lineHeight: 1.08,
                  color: "#FFFFFF",
                  margin: "0 0 22px",
                  letterSpacing: "-0.03em",
                }}
              >
                Plan events.<br />
                <span >Book vendors.</span><br />
                Measure everything.
              </h1>

              {/* Sub-copy */}
              <p
                style={{
                  fontSize: "1.075rem",
                  color: "rgba(255,255,255,0.62)",
                  lineHeight: 1.72,
                  margin: "0 0 40px",
                  maxWidth: 460,
                  fontWeight: 400,
                }}
              >
                Avoeline connects organizers and vendors on a single platform — from the first quote to final analytics.
              </p>

              {/* CTA buttons */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Link
                  href="/auth/signup"
                  id="hero-organizer-cta"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#FFFFFF", color: "#0A0A0C",
                    fontSize: "0.9rem", fontWeight: 600,
                    padding: "13px 24px", borderRadius: 100,
                    textDecoration: "none",
                  }}
                >
                  Start as Organizer →
                </Link>
                <Link
                  href="/auth/signup"
                  id="hero-vendor-cta"
                  style={{
                    display: "inline-flex", alignItems: "center",
                    background: "transparent", color: "#FFFFFF",
                    fontSize: "0.9rem", fontWeight: 600,
                    padding: "13px 24px", borderRadius: 100,
                    border: "1px solid rgba(255,255,255,0.28)",
                    textDecoration: "none",
                  }}
                >
                  Join as Vendor
                </Link>
              </div>

              {/* Trust strip */}
              <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 48 }}>
                {[
                  ["500+", "Events hosted"],
                  ["1.2K+", "Vendors onboard"],
                  ["PKR 50M+", "Managed revenue"],
                ].map(([val, lbl]) => (
                  <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        fontSize: "1.05rem",
                        fontWeight: 600,
                        color: "#FFFFFF",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {val}
                    </span>
                    <span style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — live analytics card */}
            <div
              style={{
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 72px 48px 24px",
              }}
            >
              <AnalyticsCardMockup />
            </div>
          </div>
        </section>

        {/* ════════════════════ SERVICES — solid white ════════════════════ */}
        <section
          id="services"
          style={{
            background: "#FFFFFF",
            padding: "100px 32px",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* Section header */}
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#14141A",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  margin: "0 0 14px",
                }}
              >
                What we offer
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.6rem)",
                  fontWeight: 700,
                  color: "#14141A",
                  margin: "0 0 16px",
                  letterSpacing: "-0.025em",
                }}
              >
                Everything for your event
              </h2>
              <p style={{ fontSize: "1rem", color: "#6B6B76", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
                A full-stack event platform with the tools organisers and vendors actually need.
              </p>
            </div>

            {/* Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {services.map((s) => (
                <div
                  key={s.title}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E8E7E4",
                    borderRadius: 16,
                    padding: 28,
                    transition: "border-color 0.15s ease, transform 0.15s ease",
                  }}
                  className="service-card"
                >
                  {/* Icon chip — solid black */}
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      background: "#14141A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 18,
                    }}
                  >
                    {s.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#14141A",
                      margin: "0 0 8px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#6B6B76", lineHeight: 1.68, margin: 0 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ HOW IT WORKS — solid black ════════════════════ */}
        <section
          id="how-it-works"
          style={{
            background: "#0A0A0C",
            padding: "100px 32px",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  margin: "0 0 14px",
                }}
              >
                The flow
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.6rem)",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: 0,
                  letterSpacing: "-0.025em",
                }}
              >
                How it works
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 40,
              }}
            >
              {steps.map((step) => (
                <div key={step.num} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Tags */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#0A0A0C",
                        background: "#FFFFFF",
                        borderRadius: 8,
                        padding: "4px 10px",
                      }}
                    >
                      {step.num}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.7)",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.28)",
                        borderRadius: 100,
                        padding: "3px 10px",
                      }}
                    >
                      {step.role}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#FFFFFF", margin: 0, letterSpacing: "-0.01em" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.68, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

      

      </main>

      <HomeFooter />
    </>
  );
}