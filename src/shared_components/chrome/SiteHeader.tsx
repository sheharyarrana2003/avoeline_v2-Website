"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { ThemeToggle } from "@/src/shared_components/ui/ThemeToggle";
import { buttonClass } from "@/src/lib/ui";

const MARKETING_LINKS = [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Events", href: "/events" },
];

const PUBLIC_LINKS = [
    { label: "Events", href: "/events" },
    { label: "Support", href: "/support" },
];

/**
 * Sticky chrome for unauthenticated surfaces. Mobile uses a real menu rather
 * than hiding the section links — the previous header dropped them below `sm`.
 */
export function SiteHeader({ variant = "marketing" }: { variant?: "marketing" | "public" }) {
    const [open, setOpen] = useState(false);
    const links = variant === "marketing" ? MARKETING_LINKS : PUBLIC_LINKS;

    return (
        <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-2.5">
                    <BrandMark className="h-8 w-8" />
                    <span className="font-display text-lg tracking-tight text-ink">Avoeline</span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
                    {links.map((n) => (
                        <Link
                            key={n.label}
                            href={n.href}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-muted hover:text-ink"
                        >
                            {n.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    <ThemeToggle />
                    <Link href="/auth/signin" className={`${buttonClass("ghost", "sm")} hidden sm:inline-flex`}>
                        Sign in
                    </Link>
                    <Link href="/auth/signup" className={buttonClass("primary", "sm")}>
                        Get started
                    </Link>
                    <button
                        type="button"
                        className="rounded-lg p-2 text-ink-soft hover:bg-muted hover:text-ink md:hidden"
                        aria-expanded={open}
                        aria-controls="site-mobile-nav"
                        aria-label={open ? "Close menu" : "Open menu"}
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {open ? (
                <nav
                    id="site-mobile-nav"
                    aria-label="Primary"
                    className="border-t border-line px-4 pb-4 pt-2 md:hidden"
                >
                    <ul className="flex flex-col">
                        {links.map((n) => (
                            <li key={n.label}>
                                <Link
                                    href={n.href}
                                    onClick={() => setOpen(false)}
                                    className="block rounded-lg px-2 py-3 text-sm font-medium text-ink-soft hover:text-ink"
                                >
                                    {n.label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <Link
                                href="/auth/signin"
                                onClick={() => setOpen(false)}
                                className="block rounded-lg px-2 py-3 text-sm font-medium text-ink-soft hover:text-ink sm:hidden"
                            >
                                Sign in
                            </Link>
                        </li>
                    </ul>
                </nav>
            ) : null}
        </header>
    );
}
