import { ORGANIZATION_TYPE_META, publicOrder, sponsorLogoSize, type EventOrganization } from "../types";

/**
 * The auto-generated "Sponsors & Partners" section on a public event page
 * (spec 5.3).
 *
 * Sponsors first and largest, sized by their tier's position in the event's own
 * tier list, then partners. Collaborators are deliberately excluded: they are
 * people with dashboard access, not a public credit, and listing them would
 * publish who works on the event alongside who paid for it.
 *
 * Renders nothing at all when there is nobody to show, rather than an empty
 * heading — an "our sponsors" band with no logos under it reads as broken.
 */
export function SponsorStrip({
    organizations,
    sponsorTiers,
}: {
    organizations: EventOrganization[];
    sponsorTiers: string[];
}) {
    const shown = publicOrder(
        organizations.filter((o) => o.type === "sponsor" || o.type === "partner"),
        sponsorTiers,
    );
    if (!shown.length) return null;

    return (
        <section className="mt-12 border-t border-line pt-8">
            <h2 className="font-display text-lg text-ink">Sponsors &amp; partners</h2>

            <ul className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-8">
                {shown.map((org) => {
                    const height = org.type === "sponsor" ? sponsorLogoSize(org.tier, sponsorTiers) : "h-10";
                    const label = org.type === "sponsor" ? org.tier : org.partnershipKind || ORGANIZATION_TYPE_META.partner.label;

                    const body = (
                        <>
                            {org.logoUrl ? (
                                // Plain <img>, matching the rest of the public page: logo URLs
                                // are organizer-supplied and not guaranteed to come from a host
                                // listed in next.config.
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
                        <li key={org.id}>
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
                })}
            </ul>
        </section>
    );
}
