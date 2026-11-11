import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { AccessGate } from "@/src/features/access/components/AccessGate";
import { accessUnlockCookieName } from "@/src/features/access/lib/accessUnlock";
import { AuthService } from "@/src/features/auth/authService";
import { PublicCompetitions } from "@/src/features/events/components/public/PublicCompetitions";
import { PublicShareMenu } from "@/src/features/events/components/public/PublicShareMenu";
import { getPublicEventView } from "@/src/features/events/publicEvent.service";
import { buttonClass } from "@/src/lib/ui";

export const metadata = { title: "Competitions — Avoeline" };

/**
 * Public competition listing — same DTO-driven cards as the event page.
 * Unlock cookie from the event gate is honored so visitors need not keep ?code=.
 */
export default async function PublicTracksPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ code?: string; invite?: string; bad?: string }>;
}) {
  const { eventId } = await params;
  const { code, invite, bad } = await searchParams;
  const jar = await cookies();
  const unlockToken = jar.get(accessUnlockCookieName(eventId))?.value ?? null;

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
    { token: invite, code, unlockToken },
  );

  if (view.kind === "unavailable") notFound();

  const qs = [invite ? `invite=${encodeURIComponent(invite)}` : ""].filter(Boolean).join("&");
  const qsSuffix = qs ? `?${qs}` : "";
  const eventHref = `/events/${eventId}${qsSuffix}`;

  if (view.kind === "gated") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
        <p className="mb-6 text-center font-display text-xl text-ink">{view.title}</p>
        <AccessGate
          eventId={view.eventId}
          inviteToken={view.inviteToken ?? invite ?? null}
          wrongCode={view.reason === "bad_code" || bad === "1"}
          reason={
            view.reason === "rate_limited" || view.reason === "closed" ? "needs_code" : view.reason
          }
        />
        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href={eventHref} className="underline">
            Back to event
          </Link>
        </p>
      </main>
    );
  }

  const { dto } = view;
  if (!dto.isHackathon) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-2xs font-medium uppercase text-ink-soft">Competitions</p>
          <h1 className="font-display text-2xl text-ink">{dto.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {dto.competitions.length} competition
            {dto.competitions.length === 1 ? "" : "s"} on this hackathon.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PublicShareMenu sharePath={dto.sharePath} title={dto.title} />
          <Link href={eventHref} className={buttonClass("secondary", "sm")}>
            Event page
          </Link>
        </div>
      </div>

      {dto.competitions.length ? (
        <PublicCompetitions eventId={dto.id} competitions={dto.competitions} qsSuffix={qsSuffix} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Lock className="h-4 w-4" aria-hidden />
          No competitions published yet.
        </p>
      )}
    </main>
  );
}
