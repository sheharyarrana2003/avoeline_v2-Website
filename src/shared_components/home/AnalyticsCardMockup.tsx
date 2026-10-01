export function AnalyticsCardMockup() {
    return (
        <div className="animate-float-card relative w-full max-w-[340px] -rotate-6 rounded-2xl border border-line bg-paper p-6 shadow-2xl">
            <span className="absolute -top-3 right-6 rounded-full bg-ink px-3 py-1 text-2xs font-medium uppercase text-ink-invert">
                Analytics
            </span>

            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-2xs font-medium uppercase text-ink-soft">Total revenue</p>
                    <p className="figure mt-1 text-3xl text-ink">PKR 4.2M</p>
                </div>
                <p className="flex items-center gap-1.5 text-2xs font-medium uppercase text-success">
                    <span className="animate-pulse-dot h-2 w-2 rounded-full bg-success" />
                    Live
                </p>
            </div>

            <svg aria-hidden="true" viewBox="0 0 272 64" className="mb-5 block h-16 w-full" fill="none">
                <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <g className="text-ink">
                    <path
                        d="M0 56 L34 48 L68 40 L102 52 L136 28 L170 20 L204 32 L238 12 L272 8 L272 64 L0 64 Z"
                        fill="url(#sparkFill)"
                    />
                    <path
                        d="M0 56 L34 48 L68 40 L102 52 L136 28 L170 20 L204 32 L238 12 L272 8"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-sparkline"
                    />
                    <circle cx="272" cy="8" r="4" fill="currentColor" />
                </g>
            </svg>

            <div className="grid grid-cols-3 gap-3 border-t border-line pt-4">
                {[
                    { label: "Events", value: "38" },
                    { label: "Vendors", value: "124" },
                    { label: "Growth", value: "+22%" },
                ].map((stat) => (
                    <div key={stat.label}>
                        <p className="text-2xs uppercase text-ink-soft">{stat.label}</p>
                        <p className="mt-0.5 font-display text-base text-ink">{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
