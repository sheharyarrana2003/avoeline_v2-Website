import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BadgeCheck, ShieldX } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import {
  bumpVerificationCount,
  getCertificateByCode,
  getCertificateById,
  renderCertSvg,
} from "@/src/features/certificates/certificates.service";
import { rateLimit } from "@/src/lib/rateLimit";

export const metadata = {
  title: "Verify a certificate — Avoeline",
  description: "Confirm an Avoeline certificate is genuine.",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = String(raw ?? "").trim();

  // Legacy UUID links → redirect to verification_code URL.
  if (UUID_RE.test(code)) {
    const byId = await getCertificateById(code);
    if (byId?.verificationCode) {
      redirect(`/verify/${byId.verificationCode}`);
    }
  }

  const certificate = code ? await getCertificateByCode(code) : null;
  const revoked = certificate?.status === "revoked";
  const genuine = !!certificate && !revoked;

  let svgPreview: string | null = null;
  if (genuine && certificate) {
    const limited = rateLimit(`cert:verify:${certificate.id}`, 40, 60);
    if (limited.ok) {
      void bumpVerificationCount(certificate.id);
    }
    try {
      const rendered = await renderCertSvg(certificate);
      svgPreview = rendered.svg;
    } catch (err) {
      console.error("[verify] SVG render failed", err);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <BrandMark className="h-7 w-7" />
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
          Avoeline
        </span>
      </Link>

      <Card tone="raised">
        <CardBody>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
                genuine ? "bg-ink text-ink-invert" : "bg-muted text-ink"
              }`}
            >
              {genuine ? <BadgeCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-lg text-ink">
                {genuine
                  ? "This certificate is genuine"
                  : revoked
                    ? "This certificate was revoked"
                    : "No such certificate"}
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                {genuine
                  ? "Issued through Avoeline. The details below are what was recorded when it was issued."
                  : revoked
                    ? "It was issued through Avoeline and has since been withdrawn by the organizer."
                    : "No certificate on Avoeline carries that identifier. Check the code for a typo."}
              </p>
            </div>
          </div>

          {certificate ? (
            <dl className="mt-6 divide-y divide-line border-t border-line">
              <Row label="Awarded to" value={certificate.data.recipient_name || "—"} />
              <Row label="Event" value={certificate.data.event_title || "—"} />
              <Row label="Role" value={certificate.data.role || "Attendee"} />
              <Row
                label="Issued"
                value={formatDateMedium(certificate.issuedAt || certificate.createdAt)}
              />
              <Row label="Status" value={<StatusBadge status={certificate.status} size="sm" />} />
              <Row
                label="Verification code"
                value={
                  <span className="break-all font-mono text-xs">
                    {certificate.verificationCode}
                  </span>
                }
              />
              <Row
                label="Certificate number"
                value={
                  <span className="break-all font-mono text-xs">
                    {certificate.certificateNumber}
                  </span>
                }
              />
            </dl>
          ) : null}

          {svgPreview ? (
            <div
              className="mt-6 overflow-auto rounded-lg border border-line bg-white p-2"
              dangerouslySetInnerHTML={{ __html: svgPreview }}
            />
          ) : null}

          {genuine && certificate ? (
            <div className="mt-6">
              <a
                href={`/certificate/${certificate.verificationCode}/download`}
                className={buttonClass("primary", "md")}
              >
                Download the PDF
              </a>
            </div>
          ) : null}

          <p className="mt-6 text-xs text-ink-soft">
            Verified against Avoeline&apos;s records at the moment this page loaded.
          </p>
        </CardBody>
      </Card>

      <p className="mt-6 text-center">
        <Link href="/events" className={buttonClass("secondary", "sm")}>
          Browse events
        </Link>
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
      <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}
