// Server Component — pure analytics card mockup (SVG sparkline + stat number)
export function AnalyticsCardMockup() {
  return (
    <div
      className="animate-float-card"
      style={{
        transform: "rotate(-6deg)",
        width: 320,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 24,
        boxShadow:
          "0 32px 80px rgba(14,14,26,0.12), 0 8px 24px rgba(108,92,231,0.08)",
        position: "relative",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--ink-soft)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            Total Revenue
          </p>
          <p
            className="mono"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "2rem",
              fontWeight: 600,
              color: "var(--ink)",
              margin: "4px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            PKR 4.2M
          </p>
        </div>

        {/* Live pulse dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            className="animate-pulse-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--success)",
              display: "block",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.7rem",
              fontWeight: 500,
              color: "var(--success)",
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Sparkline SVG */}
      <svg
        width="272"
        height="64"
        viewBox="0 0 272 64"
        fill="none"
        style={{ display: "block", marginBottom: 16 }}
      >
        {/* Gradient fill under sparkline */}
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path
          d="M0 56 L34 48 L68 40 L102 52 L136 28 L170 20 L204 32 L238 12 L272 8 L272 64 L0 64 Z"
          fill="url(#sparkFill)"
        />
        {/* Sparkline stroke */}
        <path
          d="M0 56 L34 48 L68 40 L102 52 L136 28 L170 20 L204 32 L238 12 L272 8"
          stroke="#6C5CE7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-sparkline"
          fill="none"
        />
        {/* Highlight dot at end */}
        <circle cx="272" cy="8" r="4" fill="#6C5CE7" />
        <circle cx="272" cy="8" r="7" fill="#6C5CE7" fillOpacity="0.2" />
      </svg>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {[
          { label: "Events", value: "38" },
          { label: "Vendors", value: "124" },
          { label: "Growth", value: "+22%" },
        ].map((stat) => (
          <div key={stat.label}>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.7rem",
                color: "var(--ink-soft)",
                margin: 0,
              }}
            >
              {stat.label}
            </p>
            <p
              className="mono"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--ink)",
                margin: "2px 0 0",
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Decorative badge */}
      <div
        style={{
          position: "absolute",
          top: -12,
          right: 24,
          background: "var(--violet-soft)",
          border: "1px solid rgba(108,92,231,0.2)",
          borderRadius: 20,
          padding: "4px 12px",
          fontFamily: "var(--font-body)",
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "var(--violet)",
        }}
      >
        Analytics
      </div>
    </div>
  );
}
