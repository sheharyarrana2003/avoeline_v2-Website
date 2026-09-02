/**
 * Sponsors, collaborators and partners.
 *
 * Client-safe: the organization form and the public sponsor strip both import
 * from here, so no `adminDb`. Reads live in organizations.service.ts, writes in
 * actions/.
 *
 * One record for all three, as the spec asks -- they share name, logo, website
 * and contact, and differ only in which extra fields apply. The alternative,
 * three collections, would triple the CRUD to express that difference.
 */

export type OrganizationType = "sponsor" | "collaborator" | "partner";

export const ORGANIZATION_TYPES: OrganizationType[] = ["sponsor", "collaborator", "partner"];

export function isOrganizationType(value: unknown): value is OrganizationType {
    return typeof value === "string" && (ORGANIZATION_TYPES as string[]).includes(value);
}

export const ORGANIZATION_TYPE_META: Record<OrganizationType, { label: string; description: string }> = {
    sponsor: { label: "Sponsor", description: "Pays or contributes in kind. Has a tier, a contract value and benefits you owe them." },
    collaborator: { label: "Collaborator", description: "Works on the event with you. Can be given access to this event's dashboard." },
    partner: { label: "Partner", description: "Media, venue or community partner. No financial details." },
};

/**
 * Default sponsorship tiers, most significant first.
 *
 * Order is meaning, not decoration: the public strip sizes sponsors by their
 * position in this list, so editing the order is how an organizer changes who
 * appears largest. Stored per event, since these are editable.
 */
export const DEFAULT_SPONSOR_TIERS = ["Title", "Platinum", "Gold", "Silver", "In-Kind"];

/** The spec's starting benefits. Editable per sponsor. */
export const DEFAULT_BENEFITS = [
    "Booth space",
    "Logo placement",
    "Stage mention",
    "Social shoutout",
    "Certificate placement",
];

export const PARTNERSHIP_KINDS = ["Media", "Venue", "Community"];

/** What a collaborator may see on the event dashboard. */
export type CollaboratorRole = "full" | "track";

export const COLLABORATOR_ROLE_META: Record<CollaboratorRole, { label: string; description: string }> = {
    full: { label: "Full access", description: "Everything on this event's dashboard." },
    track: { label: "One track only", description: "Limited to the track you assign them." },
};

/** One benefit owed to a sponsor, and whether it has been delivered. */
export interface SponsorBenefit {
    label: string;
    delivered: boolean;
    /** ISO, set when it was ticked off. Null while outstanding. */
    deliveredAt: string | null;
}

export interface EventOrganization {
    id: string;
    eventId: string;
    type: OrganizationType;
    name: string;
    logoUrl: string;
    websiteUrl: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;

    /* --- sponsor only --- */
    tier: string;
    contractValue: number;
    benefits: SponsorBenefit[];

    /* --- collaborator only --- */
    role: CollaboratorRole;
    /** Set once they accept, linking the invite to a real account. */
    userId: string | null;
    invitedEmail: string;
    invitedAt: string | null;
    acceptedAt: string | null;
    /** Unguessable; the accept link's credential. */
    inviteToken: string | null;
    /**
     * Which track a `track`-role collaborator is limited to. Tracks arrive with
     * the hackathon module, so this is stored and not yet enforced anywhere --
     * a `track` collaborator is treated as having no dashboard access until it is.
     */
    trackId: string;

    /* --- partner only --- */
    partnershipKind: string;

    /**
     * Track this sponsor belongs to, for the per-track sponsor display the spec
     * asks for. Same caveat: tracks do not exist yet, so this is carried and
     * unused rather than guessed at.
     */
    sponsorTrackId: string;

    createdAt: string | null;
    updatedAt: string | null;
}

/** "3 of 5 delivered", and the ratio behind it. */
export function benefitProgress(benefits: SponsorBenefit[]): { delivered: number; total: number; label: string } {
    const total = benefits.length;
    const delivered = benefits.filter((b) => b.delivered).length;
    return { delivered, total, label: total ? `${delivered} of ${total} delivered` : "No benefits listed" };
}

/**
 * Sponsors first and in tier order, then partners, then collaborators.
 *
 * Collaborators come last because they are not a public-facing credit -- they
 * are people with dashboard access, and the spec's public section is about who
 * backed the event. A tier the event no longer lists sorts to the end rather
 * than to the front, which is what `indexOf` returning -1 would otherwise do.
 */
export function publicOrder(orgs: EventOrganization[], tiers: string[]): EventOrganization[] {
    const typeRank: Record<OrganizationType, number> = { sponsor: 0, partner: 1, collaborator: 2 };
    const tierRank = (tier: string) => {
        const i = tiers.indexOf(tier);
        return i === -1 ? tiers.length : i;
    };
    return [...orgs].sort((a, b) => {
        if (a.type !== b.type) return typeRank[a.type] - typeRank[b.type];
        if (a.type === "sponsor") {
            const byTier = tierRank(a.tier) - tierRank(b.tier);
            if (byTier !== 0) return byTier;
        }
        return a.name.localeCompare(b.name);
    });
}

/**
 * How large a sponsor's logo renders, from its tier's position.
 *
 * Returns a Tailwind height class rather than a number so the caller does not
 * do arithmetic in a class string, which Tailwind cannot see at build time.
 */
export function sponsorLogoSize(tier: string, tiers: string[]): string {
    const i = tiers.indexOf(tier);
    const steps = ["h-20", "h-16", "h-14", "h-12", "h-10"];
    return steps[i === -1 ? steps.length - 1 : Math.min(i, steps.length - 1)];
}

/** One benefit per line, blanks dropped, duplicates collapsed, order kept. */
export function parseBenefitLines(text: string, existing: SponsorBenefit[] = []): SponsorBenefit[] {
    const wasDelivered = new Map(existing.map((b) => [b.label.toLowerCase(), b]));
    const seen = new Set<string>();
    return String(text ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()))
        .map((label) => {
            // Editing the list must not silently un-deliver a benefit that was
            // already ticked off, so delivery state is carried over by label.
            const prior = wasDelivered.get(label.toLowerCase());
            return {
                label,
                delivered: prior?.delivered ?? false,
                deliveredAt: prior?.deliveredAt ?? null,
            };
        });
}
