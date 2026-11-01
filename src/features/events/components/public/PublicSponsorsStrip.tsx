import { ORGANIZATION_TYPE_META, sponsorLogoSize } from "@/src/features/organizations/types";
import type { PublicOrgCredit } from "@/src/features/events/types";

/**
 * Public credits for sponsors / collaborators / partners.
 * Only render groups the organizer toggled on (caller filters).
 */
export function PublicSponsorsStrip({
  sponsors,
  collaborators,
  partners,
  sponsorTiers = [],
}: {
  sponsors: PublicOrgCredit[];
  collaborators: PublicOrgCredit[];
  partners: PublicOrgCredit[];
  sponsorTiers?: string[];
}) {
  const hasAny = sponsors.length + collaborators.length + partners.length > 0;
  if (!hasAny) return null;

  return (
    <section className="mt-12 space-y-10 border-t border-line pt-8">
      {sponsors.length ? (
        <CreditBlock title="Sponsors">
          {sponsors.map((org) => (
            <CreditItem
              key={org.id}
              org={org}
              height={sponsorLogoSize(org.tier, sponsorTiers.length ? sponsorTiers : [org.tier])}
              label={org.tier}
            />
          ))}
        </CreditBlock>
      ) : null}

      {collaborators.length ? (
        <CreditBlock title="Collaborators">
          {collaborators.map((org) => (
            <CreditItem
              key={org.id}
              org={org}
              height="h-10"
              label={org.kindLabel || ORGANIZATION_TYPE_META.collaborator.label}
            />
          ))}
        </CreditBlock>
      ) : null}

      {partners.length ? (
        <CreditBlock title="Partners">
          {partners.map((org) => (
            <CreditItem
              key={org.id}
              org={org}
              height="h-10"
              label={org.kindLabel || ORGANIZATION_TYPE_META.partner.label}
            />
          ))}
        </CreditBlock>
      ) : null}
    </section>
  );
}

function CreditBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <ul className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-8">{children}</ul>
    </div>
  );
}

function CreditItem({
  org,
  height,
  label,
}: {
  org: PublicOrgCredit;
  height: string;
  label?: string;
}) {
  const body = (
    <>
      {org.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={org.logoUrl}
          alt={org.name}
          className={`${height} w-auto max-w-44 object-contain`}
        />
      ) : (
        <span className={`flex ${height} items-center font-display text-ink`}>{org.name}</span>
      )}
      {label ? (
        <span className="mt-2 block text-2xs font-medium uppercase text-ink-soft">{label}</span>
      ) : null}
    </>
  );

  return (
    <li>
      {org.websiteUrl ? (
        <a
          href={org.websiteUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block rounded-xs transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  );
}
