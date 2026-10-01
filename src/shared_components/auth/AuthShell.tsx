import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";

/**
 * Split-pane shell for sign-in and sign-up. The ink panel stays dark in both
 * themes (see `.ink-panel`) so the form can follow the product tokens without
 * the marketing-page contrast trap of hardcoded white surfaces.
 */
export function AuthShell({
    eyebrow,
    headline,
    copy,
    children,
}: {
    eyebrow?: string;
    headline: string;
    copy: string;
    children: ReactNode;
}) {
    return (
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <aside className="ink-panel on-ink relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
                <Link href="/" className="inline-flex items-center gap-2.5 text-white">
                    <BrandMark inverted className="h-9 w-9" />
                    <span className="font-display text-xl tracking-tight">Avoeline</span>
                </Link>

                <div className="max-w-md">
                    {eyebrow ? (
                        <p className="mb-4 text-2xs font-medium uppercase tracking-[0.14em] text-white/45">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h2 className="font-display text-4xl leading-[1.1] text-white">{headline}</h2>
                    <p className="mt-5 text-base leading-relaxed text-white/65">{copy}</p>
                </div>

                <p className="text-xs text-white/40">Plan. Book. Measure.</p>
            </aside>

            <div className="flex flex-col justify-center bg-canvas px-4 py-16 sm:px-8">
                <div className="mx-auto w-full max-w-[420px]">
                    <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
                        <BrandMark className="h-9 w-9" />
                        <span className="font-display text-lg text-ink">Avoeline</span>
                    </Link>
                    {children}
                </div>
            </div>
        </div>
    );
}
