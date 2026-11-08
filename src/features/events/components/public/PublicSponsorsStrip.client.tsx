"use client";

import { useState } from "react";
import { ORGANIZATION_TYPE_META, sponsorLogoSize } from "@/src/features/organizations/types";
import type { PublicOrgCredit } from "@/src/features/events/types";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass } from "@/src/lib/ui";
import { ExternalLink } from "lucide-react";

/**
 * Public credits: list with Preview opening a detail modal (no in-place accordion).
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
  const [open, setOpen] = useState<PublicOrgCredit | null>(null);
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
              onPreview={() => setOpen(org)}
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
              onPreview={() => setOpen(org)}
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
              onPreview={() => setOpen(org)}
            />
          ))}
        </CreditBlock>
      ) : null}

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name}
        maxWidth="md"
        footer={
          open?.websiteUrl ? (
            <a
              href={open.websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`${buttonClass("primary", "sm")} inline-flex items-center gap-2`}
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              Visit website
            </a>
          ) : (
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setOpen(null)}
            >
              Close
            </button>
          )
        }
      >
        {open ? (
          <div className="space-y-4 text-sm text-ink">
            {open.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.logoUrl} alt="" className="h-16 w-auto max-w-full object-contain" />
            ) : null}
            <p>
              <span className="text-2xs font-medium uppercase text-ink-soft">Role</span>
              <br />
              <span className="capitalize">{open.type}</span>
              {open.tier || open.kindLabel ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-ink-soft">
                    {open.type === "sponsor" ? open.tier : open.kindLabel}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </Modal>
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
  onPreview,
}: {
  org: PublicOrgCredit;
  height: string;
  label?: string;
  onPreview: () => void;
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
    <li className="flex flex-col items-start gap-2">
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
      <button type="button" className={buttonClass("ghost", "sm")} onClick={onPreview}>
        Preview
      </button>
    </li>
  );
}
