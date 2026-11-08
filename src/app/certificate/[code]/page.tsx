import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import {
  getCertificateByCode,
  getCertificateById,
  renderCertSvg,
} from "@/src/features/certificates/certificates.service";
import { rateLimit } from "@/src/lib/rateLimit";

export const metadata = {
  title: "Certificate — Avoeline",
  description: "View and download your Avoeline certificate.",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CertificateViewerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = String(raw ?? "").trim();

  if (UUID_RE.test(code)) {
    const byId = await getCertificateById(code);
    if (byId?.verificationCode) {
      redirect(`/certificate/${byId.verificationCode}`);
    }
  }

  const certificate = code ? await getCertificateByCode(code) : null;
  const revoked = certificate?.status === "revoked";
  const ok = !!certificate && !revoked;

  let svgPreview: string | null = null;
  if (ok && certificate) {
    const limited = rateLimit(`cert:view:${certificate.id}`, 40, 60);
    if (limited.ok) {
      try {
        const rendered = await renderCertSvg(certificate);
        svgPreview = rendered.svg;
      } catch (err) {
        console.error("[certificate viewer] SVG render failed", err);
      }
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
        <CardBody className="space-y-4">
          <div>
            <h1 className="font-display text-lg text-ink">
              {ok
                ? "Your certificate"
                : revoked
                  ? "This certificate was revoked"
                  : "Certificate not found"}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {ok
                ? "Rendered on demand from the organizer’s template. Download the PDF anytime — no Drive required."
                : revoked
                  ? "It was issued through Avoeline and has since been withdrawn."
                  : "Check the link for a typo, or ask the organizer to re-send your certificate email."}
            </p>
          </div>

          {ok && certificate ? (
            <>
              <dl className="divide-y divide-line border-t border-line text-sm">
                <div className="flex justify-between gap-2 py-2">
                  <dt className="text-ink-soft">Awarded to</dt>
                  <dd className="text-ink">{certificate.data.recipient_name || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2 py-2">
                  <dt className="text-ink-soft">Event</dt>
                  <dd className="text-ink">{certificate.data.event_title || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2 py-2">
                  <dt className="text-ink-soft">Issued</dt>
                  <dd className="text-ink">
                    {formatDateMedium(certificate.issuedAt || certificate.createdAt)}
                  </dd>
                </div>
              </dl>

              {svgPreview ? (
                <div
                  className="overflow-auto rounded-lg border border-line bg-white p-2"
                  dangerouslySetInnerHTML={{ __html: svgPreview }}
                />
              ) : (
                <p className="text-sm text-ink-soft">
                  Preview unavailable right now — you can still download the PDF.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/certificate/${certificate.verificationCode}/download`}
                  className={buttonClass("primary", "md")}
                >
                  Download PDF
                </a>
                <Link
                  href={`/verify/${certificate.verificationCode}`}
                  className={buttonClass("secondary", "md")}
                >
                  Verify authenticity
                </Link>
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>
    </main>
  );
}
