import {
    CalendarDays,
    LineChart,
    Bell,
    Clock3,
    FileSpreadsheet,
    Users,
} from "lucide-react";
import { SiteHeader } from "@/src/shared_components/chrome/SiteHeader";
import { AppFooter } from "@/src/shared_components/chrome/AppFooter";
import { AnalyticsCardMockup } from "@/src/shared_components/home/AnalyticsCardMockup";
import { buttonClass } from "@/src/lib/ui";
import Link from "next/link";

const services = [
    {
        icon: CalendarDays,
        title: "Event planning",
        desc: "Agendas, timelines, speakers, and access — one workspace from draft to doors.",
    },
    {
        icon: Users,
        title: "Vendor network",
        desc: "Discover, quote, and book a curated roster without leaving the event record.",
    },
    {
        icon: LineChart,
        title: "Live analytics",
        desc: "Revenue, attendance, and growth on a dashboard that updates as people register.",
    },
    {
        icon: FileSpreadsheet,
        title: "Smart quotes",
        desc: "Itemised proposals you can compare, counter, and accept in a single thread.",
    },
    {
        icon: Clock3,
        title: "Booking management",
        desc: "Confirmations and schedules in one timeline instead of a stack of inboxes.",
    },
    {
        icon: Bell,
        title: "Notifications",
        desc: "Vendor replies, check-ins, and alerts land where the work already is.",
    },
];

const steps = [
    { num: "01", role: "Organizer", title: "Create the event", desc: "Details, agenda, and requirements in minutes — not a week of spreadsheets." },
    { num: "02", role: "Organizer", title: "Request quotes", desc: "Browse verified vendors and send a brief without leaving the event." },
    { num: "03", role: "Vendor", title: "Submit a proposal", desc: "Respond with an itemised quote. Organizers compare apples to apples." },
    { num: "04", role: "Both", title: "Track and analyse", desc: "Watch registrations, revenue, and vendor performance as they happen." },
];

const marquee = [
    "Agendas",
    "Quotes",
    "Certificates",
    "Hackathons",
    "Check-in",
    "Sponsors",
    "Analytics",
    "Marketplace",
];

export default function HomePage() {
    return (
        <div className="flex flex-1 flex-col bg-canvas">
            <SiteHeader variant="marketing" />

            <main className="flex-1">
                <section className="ink-panel on-ink relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_80%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
                    <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <div>
                            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80">
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                Event operations, without the noise
                            </p>
                            <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl">
                                Plan events.
                                <br />
                                Book vendors.
                                <br />
                                <span className="text-white/45">Measure everything.</span>
                            </h1>
                            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
                                Avoeline is the black-and-white workspace for organizers and vendors — from the first quote to the last report.
                            </p>
                            <div className="mt-10 flex flex-wrap items-center gap-3">
                                <Link href="/auth/signup?role=organizer" className={buttonClass("primary", "lg", "bg-white text-gray-950 border-white hover:bg-white/90 hover:border-white")}>
                                    Start as organizer
                                </Link>
                                <Link
                                    href="/auth/signup?role=vendor"
                                    className="inline-flex h-11 items-center rounded-xl border border-white/25 px-5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
                                >
                                    Join as vendor
                                </Link>
                            </div>
                            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
                                {[
                                    ["500+", "Events hosted"],
                                    ["1.2K+", "Vendors"],
                                    ["PKR 50M+", "Managed"],
                                ].map(([val, lbl]) => (
                                    <div key={lbl}>
                                        <dt className="sr-only">{lbl}</dt>
                                        <dd className="font-display text-2xl text-white">{val}</dd>
                                        <p className="mt-1 text-xs text-white/45">{lbl}</p>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <div className="flex min-w-0 items-center justify-center py-6 lg:justify-end">
                            <AnalyticsCardMockup />
                        </div>
                    </div>
                </section>

                <div className="overflow-hidden border-y border-line bg-paper py-4">
                    <div className="flex w-max animate-marquee gap-10 pr-10 text-2xs font-medium uppercase tracking-[0.18em] text-ink-soft">
                        {[...marquee, ...marquee].map((item, i) => (
                            <span key={`${item}-${i}`} className="flex items-center gap-10">
                                {item}
                                <span className="h-px w-8 bg-line-loud" aria-hidden="true" />
                            </span>
                        ))}
                    </div>
                </div>

                <section id="product" className="px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="mx-auto mb-14 max-w-xl text-center">
                            <p className="text-2xs font-medium uppercase text-ink-soft">What we offer</p>
                            <h2 className="mt-3 font-display text-4xl tracking-tight text-ink">Everything the event actually needs</h2>
                            <p className="mt-4 text-base leading-relaxed text-ink-soft">
                                Tools organizers and vendors already use — rebuilt as one product, not six tabs.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {services.map((s) => (
                                <article
                                    key={s.title}
                                    className="lift rounded-2xl border border-line bg-paper p-7"
                                >
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-ink-invert">
                                        <s.icon className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <h3 className="font-display text-lg text-ink">{s.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="ink-panel on-ink px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-14 max-w-xl">
                            <p className="text-2xs font-medium uppercase text-white/45">The flow</p>
                            <h2 className="mt-3 font-display text-4xl tracking-tight text-white">How it works</h2>
                        </div>
                        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((step) => (
                                <li key={step.num} className="relative">
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-medium text-gray-950">
                                            {step.num}
                                        </span>
                                        <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-2xs uppercase text-white/60">
                                            {step.role}
                                        </span>
                                    </div>
                                    <h3 className="font-display text-lg text-white">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-white/55">{step.desc}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl border border-line bg-paper px-8 py-12 shadow-sm sm:px-12 lg:flex-row lg:items-center">
                        <div>
                            <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
                                Ready to run the next one properly?
                            </h2>
                            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
                                Create an organizer workspace, or join as a vendor and start receiving briefs.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/auth/signup?role=organizer" className={buttonClass("primary", "lg")}>
                                Create an account
                            </Link>
                            <Link href="/events" className={buttonClass("secondary", "lg")}>
                                Browse events
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <AppFooter />
        </div>
    );
}
