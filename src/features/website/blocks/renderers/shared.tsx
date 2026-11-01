import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";

export function SectionShell({
  children,
  dark,
  className = "",
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <section
      className={
        dark
          ? `ink-panel on-ink relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 ${className}`
          : `px-4 py-14 sm:px-6 sm:py-16 lg:px-8 ${className}`
      }
    >
      <div className="relative mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

export function SectionTitle({
  title,
  body,
  dark,
}: {
  title?: string;
  body?: string;
  dark?: boolean;
}) {
  if (!title?.trim() && !body?.trim()) return null;
  return (
    <div className="mb-8 max-w-2xl">
      {title?.trim() ? (
        <h2
          className={`font-display text-3xl tracking-tight sm:text-4xl ${
            dark ? "text-white" : "text-[var(--mkt-ink)]"
          }`}
        >
          {title.trim()}
        </h2>
      ) : null}
      {body?.trim() ? (
        <p
          className={`mt-3 text-base leading-relaxed ${dark ? "text-white/65" : "text-[var(--mkt-muted)]"}`}
        >
          {body.trim()}
        </p>
      ) : null}
    </div>
  );
}

export function CtaButtons({
  primary,
  secondary,
  dark,
}: {
  primary?: { label?: string; href?: string } | null;
  secondary?: { label?: string; href?: string } | null;
  dark?: boolean;
}) {
  const pLabel = primary?.label?.trim();
  const pHref = primary?.href?.trim();
  const sLabel = secondary?.label?.trim();
  const sHref = secondary?.href?.trim();
  if (!pLabel && !sLabel) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {pLabel && pHref ? (
        <Link
          href={pHref}
          className={
            dark
              ? buttonClass(
                  "primary",
                  "lg",
                  "bg-white text-gray-950 border-white hover:bg-white/90 hover:border-white",
                )
              : buttonClass("primary", "lg")
          }
        >
          {pLabel}
        </Link>
      ) : null}
      {sLabel && sHref ? (
        <Link
          href={sHref}
          className={
            dark
              ? "inline-flex h-11 items-center rounded-xl border border-white/25 px-5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              : buttonClass("secondary", "lg")
          }
        >
          {sLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
