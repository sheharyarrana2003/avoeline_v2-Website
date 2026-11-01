import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Handshake } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import { formatDate } from "@/src/lib/datetime";
import { absoluteUrl } from "@/src/lib/appUrl";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { eventIsHackathon, listTracks } from "@/src/features/hackathon/hackathon.service";
import {
  getEventOrganizations,
  listPartnerTypes,
} from "@/src/features/organizations/organizations.service";
import { OrganizationForm } from "@/src/features/organizations/components/OrganizationForm";
import { InviteCollaborator } from "@/src/features/organizations/components/InviteCollaborator";
import {
  removeOrganization,
  toggleBenefit,
} from "@/src/features/organizations/actions/organizations.action";
import {
  ORGANIZATION_TYPE_META,
  benefitProgress,
  publicOrder,
  sponsorTierTone,
} from "@/src/features/organizations/types";
import { PublicShowToggles } from "@/src/features/organizations/components/PublicShowToggles";

export default async function EventSponsorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const { edit } = await searchParams;

  const event = await assertOwnedEvent(eventId);
  if (!event) notFound();

  const isHackathon = await eventIsHackathon(event);
  const tracks = isHackathon ? await listTracks(eventId) : [];
  const trackName = (id: string) => tracks.find((t) => t.id === id)?.name;

  const [orgsRaw, partnerTypes] = await Promise.all([
    getEventOrganizations(eventId),
    listPartnerTypes(event.organizerId),
  ]);
  const orgs = publicOrder(orgsRaw, event.sponsorTiers);
  const origin = await absoluteUrl("/collaborate");
  const editing = edit ? orgs.find((o) => o.id === edit) : undefined;
  const base = `/organizer/${organizer_id}/events/${eventId}/sponsors`;

  const sponsors = orgs.filter((o) => o.type === "sponsor");
  const totalValue = sponsors.reduce((sum, s) => sum + (s.contractValue || 0), 0);
  const currency = event.pricing?.currency || "PKR";
  const benefitTotals = sponsors.reduce(
    (acc, s) => {
      const p = benefitProgress(s.benefits);
      acc.delivered += p.delivered;
      acc.total += p.total;
      return acc;
    },
    { delivered: 0, total: 0 },
  );
  const tierLine = event.sponsorTiers
    .map((tier) => {
      const inTier = sponsors.filter((s) => s.tier === tier);
      if (!inTier.length) return null;
      const sum = inTier.reduce((s, o) => s + (o.contractValue || 0), 0);
      return `${tier}: ${formatCurrency(sum, currency, "—")}`;
    })
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Card title={editing ? `Edit ${editing.name}` : "Add a sponsor, collaborator or partner"}>
          <CardBody>
            <OrganizationForm
              key={editing?.id ?? "new"}
              eventId={eventId}
              sponsorTiers={event.sponsorTiers}
              editing={editing}
              onDone={editing ? base : undefined}
              tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
              isHackathon={isHackathon}
              partnerTypes={partnerTypes}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card title="Show on public page">
            <CardBody>
              <PublicShowToggles
                eventId={eventId}
                showSponsors={!!event.showSponsors}
                showCollaborators={!!event.showCollaborators}
                showPartners={!!event.showPartners}
              />
            </CardBody>
          </Card>

          <Card
            title="Sponsor income"
            action={
              <span className="text-2xs uppercase text-ink-soft tabular-nums">
                {sponsors.length} sponsor{sponsors.length === 1 ? "" : "s"}
              </span>
            }
          >
            <CardBody>
              <p className="font-display text-3xl text-ink">
                {formatCurrency(totalValue, currency, "—")}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Total contract value across all sponsors.
              </p>
              {tierLine ? <p className="mt-3 text-sm text-ink">{tierLine}</p> : null}
              <p className="mt-2 text-xs text-ink-soft">
                {benefitTotals.total
                  ? `${benefitTotals.delivered} of ${benefitTotals.total} benefits delivered across all sponsors`
                  : "No benefits listed yet"}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {orgs.length === 0 ? (
        <Card>
          <div className="p-6">
            <EmptyState
              icon={<Handshake size={32} className="text-primary" />}
              title="Nobody added yet"
              description="Add the sponsors, collaborators and partners behind this event. Turn on “Show on public page” above when you are ready for them to appear publicly."
            />
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => {
            const progress = benefitProgress(org.benefits);
            const dedicated = org.trackId ? trackName(org.trackId) : null;
            return (
              <Card key={org.id} tone={org.type === "sponsor" ? "raised" : "flat"}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {org.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={org.logoUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl border border-line object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-muted font-display text-sm text-ink">
                          {org.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-base text-ink">{org.name}</h2>
                          <StatusBadge
                            status="neutral"
                            label={ORGANIZATION_TYPE_META[org.type].label}
                            size="sm"
                          />
                          {org.type === "sponsor" && org.tier ? (
                            <StatusBadge
                              status={sponsorTierTone(org.tier, event.sponsorTiers)}
                              label={org.tier}
                              size="sm"
                            />
                          ) : null}
                          {org.partnershipKind ? (
                            <StatusBadge status="info" label={org.partnershipKind} size="sm" />
                          ) : null}
                          {dedicated ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-2xs uppercase text-ink-soft">
                              {dedicated}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-ink-soft">
                          {[org.contactName, org.contactEmail, org.contactPhone]
                            .filter(Boolean)
                            .join(" · ") || "No contact details"}
                        </p>
                        {org.type === "sponsor" && org.contractValue ? (
                          <p className="mt-1 text-sm text-ink tabular-nums">
                            {formatCurrency(org.contractValue, currency, "—")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`${base}?edit=${org.id}`} className={buttonClass("ghost", "sm")}>
                        Edit
                      </Link>
                      <form action={removeOrganization}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="id" value={org.id} />
                        <ConfirmSubmit
                          title={`Remove ${org.name}?`}
                          description={
                            org.type === "collaborator"
                              ? "They lose access to this event's dashboard immediately."
                              : "They stop appearing on the public event page."
                          }
                          confirmLabel="Remove"
                          className={buttonClass("destructive", "sm")}
                        >
                          Remove
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </div>

                  {org.type === "sponsor" && org.benefits.length ? (
                    <div className="mt-5 border-t border-line pt-4">
                      <p className="mb-3 text-2xs font-medium uppercase text-ink-soft tabular-nums">
                        {progress.label}
                      </p>
                      <ul className="space-y-1">
                        {org.benefits.map((benefit, index) => (
                          <li key={`${index}-${benefit.label}`}>
                            <form action={toggleBenefit}>
                              <input type="hidden" name="eventId" value={eventId} />
                              <input type="hidden" name="id" value={org.id} />
                              <input type="hidden" name="index" value={index} />
                              <button
                                type="submit"
                                aria-pressed={benefit.delivered}
                                className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
                                    benefit.delivered
                                      ? "border-ink bg-ink text-ink-invert"
                                      : "border-line-loud"
                                  }`}
                                >
                                  {benefit.delivered ? <Check className="h-3 w-3" /> : null}
                                </span>
                                <span
                                  className={`text-sm ${benefit.delivered ? "text-ink-soft line-through" : "text-ink"}`}
                                >
                                  {benefit.label}
                                  {benefit.deliveredAt ? (
                                    <span className="ml-2 text-2xs text-ink-faint">
                                      {formatDate(benefit.deliveredAt)}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {org.type === "collaborator" ? (
                    <div className="mt-5 border-t border-line pt-4">
                      {org.acceptedAt ? (
                        <p className="text-sm text-ink">
                          Accepted {formatDate(org.acceptedAt)} ·{" "}
                          {org.role === "full" ? "full access" : "track only"}
                        </p>
                      ) : (
                        <>
                          <p className="mb-2 text-sm text-ink-soft">
                            {org.invitedAt
                              ? `Invited ${formatDate(org.invitedAt)} to ${org.invitedEmail} — not accepted yet.`
                              : "Not invited yet."}
                          </p>
                          {org.inviteToken ? (
                            <p className="mb-3 break-all">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-2xs text-ink-soft">
                                {`${origin}/${org.inviteToken}`}
                              </code>
                            </p>
                          ) : null}
                          <InviteCollaborator
                            eventId={eventId}
                            id={org.id}
                            defaultEmail={org.invitedEmail || org.contactEmail}
                          />
                        </>
                      )}
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
