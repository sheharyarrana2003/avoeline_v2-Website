import Link from "next/link";
import { supabaseAdmin } from "@/data/supabase";

type AnnouncementValue = {
  message?: unknown;
  text?: unknown;
  href?: unknown;
  link?: unknown;
  starts_at?: unknown;
  start_date?: unknown;
  ends_at?: unknown;
  end_date?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function inWindow(startsAt: string | null, endsAt: string | null, now: Date): boolean {
  if (startsAt) {
    const start = new Date(startsAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (endsAt) {
    const end = new Date(endsAt);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

/**
 * Server-read announcement from `site_settings` key `announcement`.
 * Missing table / empty / outside dates → hide. Safe before the CMS migration.
 */
export async function AnnouncementBanner() {
  let message: string | null = null;
  let href: string | null = null;

  try {
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "announcement")
      .maybeSingle();

    if (error || !data?.value) return null;

    const value = (
      typeof data.value === "object" && data.value !== null
        ? data.value
        : typeof data.value === "string"
          ? { message: data.value }
          : null
    ) as AnnouncementValue | null;

    if (!value) return null;

    message = asString(value.message) ?? asString(value.text);
    if (!message) return null;

    const startsAt = asString(value.starts_at) ?? asString(value.start_date);
    const endsAt = asString(value.ends_at) ?? asString(value.end_date);
    if (!inWindow(startsAt, endsAt, new Date())) return null;

    href = asString(value.href) ?? asString(value.link);
  } catch {
    return null;
  }

  return (
    <div className="border-b border-[var(--mkt-line)] bg-[var(--mkt-accent-tint)] text-[var(--mkt-text)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-2 px-4 py-2.5 text-center text-sm sm:px-6 lg:px-8">
        {href ? (
          <Link
            href={href}
            className="font-medium text-[var(--mkt-accent)] underline-offset-2 hover:underline"
          >
            {message}
          </Link>
        ) : (
          <p className="font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
