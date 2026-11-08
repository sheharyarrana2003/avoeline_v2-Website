/**
 * Sponsors, collaborators and partners.
 *
 * Client-safe: the organization form and the public sponsor strip both import
 * from here, so no `supabaseAdmin`. Reads live in organizations.service.ts, writes in
 * actions/.
 *
 * One record for all three, as the spec asks -- they share name, logo, website
 * and contact, and differ only in which extra fields apply. The alternative,
 * three tables, would triple the CRUD to express that difference.
 */

export type OrganizationType = "sponsor" | "collaborator" | "partner";

export const ORGANIZATION_TYPES: OrganizationType[] = ["sponsor", "collaborator", "partner"];

export function isOrganizationType(value: unknown): value is OrganizationType {
  return typeof value === "string" && (ORGANIZATION_TYPES as string[]).includes(value);
}

export const ORGANIZATION_TYPE_META: Record<
  OrganizationType,
  { label: string; description: string }
> = {
  sponsor: {
    label: "Sponsor",
    description:
      "Pays or contributes in kind. Has a tier, a contract value and benefits you owe them.",
  },
  collaborator: {
    label: "Collaborator",
    description:
      "Contributes to the event (session, swag, venue, etc.). Terms are required; dashboard access is not granted here.",
  },
  partner: {
    label: "Partner",
    description: "Non-financial partner with a type (media, venue, technology, …).",
  },
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

export const PARTNERSHIP_KINDS = [
  "Media",
  "Venue",
  "Community",
  "Technology",
  "Education",
  "Logistics",
  "Marketing",
  "Hospitality",
] as const;

export const PARTNER_TYPE_DEFINITIONS: Record<string, string> = {
  Media: "Press, podcasts, or outlets that cover the event.",
  Venue: "Space or facilities provided without a sponsorship contract.",
  Community: "Student societies, alumni groups, or local networks.",
  Technology: "Platforms, tools, or infrastructure partners.",
  Education: "Schools, labs, or training partners.",
  Logistics: "Transport, lodging coordination, or ops support.",
  Marketing: "Promotion, design, or campaign partners.",
  Hospitality: "Food, catering, or guest experience partners.",
};

export const CONTRIBUTION_KINDS = [
  "Session",
  "Swag",
  "Venue",
  "Media coverage",
  "Prizes in kind",
  "Speaker",
  "Other",
] as const;

export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

/** @deprecated Phase 4 — collaborators no longer get dashboard access via this form. */
export type CollaboratorRole = "full" | "track";

/** @deprecated */
export const COLLABORATOR_ROLE_META: Record<
  CollaboratorRole,
  { label: string; description: string }
> = {
  full: {
    label: "Co-organizer / Full access",
    description: "Everything on this event's dashboard.",
  },
  track: { label: "Track-limited", description: "Dashboard access scoped to one competition." },
};

/** Visual weight for a sponsor tier badge — earlier in the list is louder. */
export function sponsorTierTone(tier: string, tiers: string[]): string {
  const i = tiers.indexOf(tier);
  if (i === 0) return "fee_paid";
  if (i === 1) return "fee_pending";
  if (i === 2) return "looking";
  return "not_required";
}

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
  /** pending | partial | received */
  paymentStatus: "pending" | "partial" | "received";
  amountReceived: number;
  receivedOn: string | null;

  /* --- collaborator only --- */
  /** @deprecated unused for new writes */
  role: CollaboratorRole;
  contributionKind: string;
  contributionCustom: string;
  collaborationTerms: string;
  /** Set once they accept, linking the invite to a real account. */
  userId: string | null;
  invitedEmail: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  /** Unguessable; the accept link's credential. */
  inviteToken: string | null;
  /**
   * Optional sponsor dedication to a competition. Collaborators no longer use track scope.
   */
  trackId: string;

  /* --- partner only --- */
  partnershipKind: string;

  /** Alias of trackId for older callers (trackSponsor, saveTrack). */
  sponsorTrackId: string;

  createdAt: string | null;
  updatedAt: string | null;
}

/** "3 of 5 delivered", and the ratio behind it. */
export function benefitProgress(benefits: SponsorBenefit[]): {
  delivered: number;
  total: number;
  label: string;
} {
  const total = benefits.length;
  const delivered = benefits.filter((b) => b.delivered).length;
  return {
    delivered,
    total,
    label: total ? `${delivered} of ${total} delivered` : "No benefits listed",
  };
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
