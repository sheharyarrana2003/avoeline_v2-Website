import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessGate } from "@/src/features/access/components/AccessGate";
import { markInviteOpenedAction } from "@/src/features/access/actions/inviteLinks.action";
import { ReportEvent } from "@/src/features/admin/components/ReportEvent";
import { reportEvent } from "@/src/features/admin/actions/events.action";
import { AuthService } from "@/src/features/auth/authService";
import { getPublicEventMeta, getPublicEventView } from "@/src/features/events/publicEvent.service";
import { PublicAbout } from "@/src/features/events/components/public/PublicAbout";
import { PublicAgenda } from "@/src/features/events/components/public/PublicAgenda";
import { PublicCompetitions } from "@/src/features/events/components/public/PublicCompetitions";
import { PublicEventFacts } from "@/src/features/events/components/public/PublicEventFacts";
import { PublicEventHero } from "@/src/features/events/components/public/PublicEventHero";
import { PublicRegisterCard } from "@/src/features/events/components/public/PublicRegisterCard";
import { PublicSpeakers } from "@/src/features/events/components/public/PublicSpeakers";
import { PublicSponsorsStrip } from "@/src/features/events/components/public/PublicSponsorsStrip";
import { PublicTiersAndDiscounts } from "@/src/features/events/components/public/PublicTiersAndDiscounts";
import { absoluteUrl } from "@/src/lib/appUrl";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ invite?: string; code?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const meta = await getPublicEventMeta(eventId);
  if (!meta) {
    return { title: "Event — Avoeline", robots: { index: false, follow: false } };
  }
  const title = `${meta.title} — Avoeline`;
  const description = meta.description || `Register for ${meta.title} on Avoeline.`;
  const ogImage = meta.bannerImage || undefined;
  return {
    title,
    description,
    robots: meta.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: meta.title,
      description,
      type: "website",
      url: await absoluteUrl(`/e/${eventId}`),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: meta.title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/**
 * Public event page — consumes allowlisted `getPublicEventView` only.
 * Secrets (access codes, whitelist, meeting passwords, promo codes, contracts)
 * never reach the client.
 */
export default async function PublicEventPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const { invite, code } = await searchParams;

  const viewer = await AuthService.getCurrentUser().catch(() => null);
  const view = await getPublicEventView(
    eventId,
    viewer
      ? {
          userId: viewer.userId,
          email: viewer.email,
          name: viewer.name,
          role: viewer.role,
          userType: viewer.userType,
          managedOrgIds: viewer.managedOrgIds,
          presidentOfOrgIds: viewer.presidentOfOrgIds,
        }
      : null,
    { token: invite, code },
  );

  if (view.kind === "unavailable") notFound();

  if (view.kind === "gated") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
        <p className="mb-6 text-center font-display text-xl text-ink">{view.title}</p>
        <AccessGate
          eventId={view.eventId}
          inviteToken={view.inviteToken ?? invite ?? null}
          wrongCode={view.reason === "bad_code"}
          reason={
            view.reason === "rate_limited" || view.reason === "closed" ? "needs_code" : view.reason
          }
        />
        {view.reason === "rate_limited" ? (
          <p className="mt-4 text-center text-sm text-ink-soft">
            Too many attempts. Please wait a minute and try again.
          </p>
        ) : null}
      </main>
    );
  }

  const { dto, preview } = view;

  if (invite) {
    await markInviteOpenedAction(invite);
  }

  const qs = [
    code ? `code=${encodeURIComponent(code)}` : "",
    invite ? `invite=${encodeURIComponent(invite)}` : "",
  ]
    .filter(Boolean)
    .join("&");
  const qsSuffix = qs ? `?${qs}` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: dto.title,
    description: dto.shortDescription || undefined,
    image: dto.bannerImage || undefined,
    eventStatus:
      dto.lifecycle === "cancelled"
        ? "https://schema.org/EventCancelled"
        : dto.lifecycle === "completed"
          ? "https://schema.org/EventScheduled"
          : "https://schema.org/EventScheduled",
    eventAttendanceMode:
      dto.schedule.formatLabel === "Online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : dto.schedule.formatLabel === "Hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    startDate: dto.schedule.startDate || undefined,
    endDate: dto.schedule.endDate || undefined,
    location: dto.location.venueName
      ? {
          "@type": "Place",
          name: dto.location.venueName,
          address:
            [dto.location.address, dto.location.city].filter(Boolean).join(", ") || undefined,
        }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: dto.organizerChip.name,
    },
    offers: {
      "@type": "Offer",
      price: dto.isFree ? 0 : undefined,
      priceCurrency: dto.currency,
      availability:
        dto.registerState === "sold_out"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      url: dto.sharePath,
    },
  };

  return (
    <main className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {preview ? (
        <p
          role="status"
          className="border-b border-warning-line bg-warning-soft px-4 py-3 text-center text-sm font-medium text-ink"
        >
          Admin preview — this event is not published publicly.
        </p>
      ) : null}

      <PublicEventHero dto={dto} preview={preview} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Mobile: register first. Desktop: content | sticky register */}
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <aside
            id="register"
            className="order-1 scroll-mt-24 lg:order-2 lg:sticky lg:top-10 lg:h-fit"
          >
            <PublicRegisterCard
              dto={dto}
              preview={preview}
              inviteToken={invite ?? null}
              accessCode={code ?? null}
              attendee={
                viewer?.userId ? { name: viewer.name ?? "", email: viewer.email ?? "" } : null
              }
            />
          </aside>

          <div className="order-2 space-y-12 lg:order-1">
            <PublicEventFacts dto={dto} />
            <PublicAbout dto={dto} />
            <PublicTiersAndDiscounts dto={dto} />
            <PublicAgenda items={dto.agenda} />
            <PublicSpeakers speakers={dto.speakers} />
          </div>
        </div>

        {dto.isHackathon ? (
          <PublicCompetitions
            eventId={dto.id}
            competitions={dto.competitions}
            qsSuffix={qsSuffix}
          />
        ) : null}

        <PublicSponsorsStrip
          sponsors={dto.sponsors}
          collaborators={dto.collaborators}
          partners={dto.partners}
          sponsorTiers={dto.sponsorTiers}
        />

        <footer className="mt-12 space-y-6 border-t border-line pt-6">
          <p className="text-sm text-ink-soft">
            Organized by <span className="font-medium text-ink">{dto.organizerChip.name}</span>
          </p>
          <ReportEvent action={reportEvent.bind(null, dto.id)} />
        </footer>
      </div>
    </main>
  );
}
