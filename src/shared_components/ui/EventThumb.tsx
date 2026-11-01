"use client";

import Image from "next/image";
import { useState } from "react";

type EventThumbProps = {
  title: string;
  src?: string | null;
  /** sm/md square; wide ≈ 96×54 (16:9) for admin tables */
  size?: "sm" | "md" | "wide";
  className?: string;
  /** Optional muted second line (e.g. category · format) */
  subtitle?: string | null;
  /** Seeds the gradient when banner is missing / broken */
  category?: string | null;
  /**
   * When false, render image/fallback only (no title text beside it).
   * Use when the title is already shown next to the thumb (e.g. CellStack).
   */
  showTitle?: boolean;
};

const SIZE: Record<
  NonNullable<EventThumbProps["size"]>,
  { w: number; h: number; rounded: string }
> = {
  sm: { w: 40, h: 40, rounded: "rounded-md" },
  md: { w: 56, h: 56, rounded: "rounded-md" },
  wide: { w: 96, h: 54, rounded: "rounded-lg" },
};

/** Stable category → gradient so empty banners do not look like broken URLs. */
function gradientFor(category: string | null | undefined, title: string): string {
  const seed = `${category || ""}:${title}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hues = [
    ["#1e3a5f", "#3d7ea6"],
    ["#2d4a3e", "#5a9a7a"],
    ["#4a3728", "#a67c52"],
    ["#3a2f4a", "#7a6a9a"],
    ["#3a3a3a", "#6e6e6e"],
    ["#1f3d3a", "#4a8a82"],
  ];
  const [a, b] = hues[Math.abs(hash) % hues.length]!;
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function Fallback({
  title,
  category,
  w,
  h,
  rounded,
}: {
  title: string;
  category?: string | null;
  w: number;
  h: number;
  rounded: string;
}) {
  const letter = (title.trim().slice(0, 1) || "?").toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${rounded} text-sm font-semibold uppercase tracking-wide text-white/90`}
      style={{ width: w, height: h, background: gradientFor(category, title) }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

/**
 * Compact event image + title for tables and side lists (ENGINEERING_RULES C3 / P5).
 * Empty or broken `banner_image` uses a designed category gradient + first letter —
 * most events have no banner set, so a plain letter on muted gray looked broken.
 */
export function EventThumb({
  title,
  src,
  size = "sm",
  className = "",
  subtitle,
  category,
  showTitle = true,
}: EventThumbProps) {
  const { w, h, rounded } = SIZE[size];
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  const media = showImage ? (
    <span
      className={`relative shrink-0 overflow-hidden ${rounded} bg-muted`}
      style={{ width: w, height: h }}
    >
      <Image
        src={src!}
        alt=""
        width={w}
        height={h}
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </span>
  ) : (
    <Fallback title={title} category={category} w={w} h={h} rounded={rounded} />
  );

  if (!showTitle) {
    return <span className={`inline-flex shrink-0 ${className}`}>{media}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      {media}
      <span className="min-w-0 flex flex-col">
        <span className="truncate text-sm font-medium text-ink">{title}</span>
        {subtitle ? <span className="truncate text-2xs text-ink-faint">{subtitle}</span> : null}
      </span>
    </span>
  );
}
