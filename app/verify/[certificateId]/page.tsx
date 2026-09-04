import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, ShieldX } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { CertificateService } from "@/src/services/certificate.service";
import { DownloadCertificate } from "@/src/features/certificates/components/DownloadCertificate";
import { downloadCertificatePublicly } from "@/src/features/certificates/actions/downloadCertificate.action";

export const metadata = {
    title: "Verify a certificate — Avoeline",
    description: "Confirm an Avoeline certificate is genuine.",
};

/**
 * Public certificate verification (spec 6.1).
 *
 * No account, no session: the whole point is that a third party -- an employer,
 * a university -- can confirm a certificate without one. `proxy.ts` matches only
 * the role prefixes, so this tree is unauthenticated by construction.
 *
 * What it shows is deliberately narrow: the holder's name, what it was for, when
 * it was issued and whether it is still valid. Not their email, not the
 * registration, nothing else on the document. A verification page answers one
 * question, and anyone on the internet can put an id in the URL.
 *
 * An unknown id and a revoked certificate are told apart, because those are
 * genuinely different answers to that question -- unlike the access gates
 * elsewhere, there is nothing here to protect by conflating them.
 */
export default async function VerifyCertificatePage({
    params,
}: {
    params: Promise<{ certificateId: string }>;
}) {
    const { certificateId } = await params;
    const certificate = await CertificateService.getCertificateById(certificateId);

    const revoked = certificate?.status === "revoked";
    const genuine = !!certificate && !revoked;

    return (
        <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
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
                                {genuine ? "This certificate is genuine" : revoked ? "This certificate was revoked" : "No such certificate"}
                            </h1>
                            <p className="mt-1 text-sm text-ink-soft">
                                {genuine
                                    ? "Issued through Avoeline. The details below are what was recorded when it was issued."
                                    : revoked
                                      ? "It was issued through Avoeline and has since been withdrawn by the organizer."
                                      : "No certificate on Avoeline carries that identifier. Check the id for a typo."}
                            </p>
                        </div>
                    </div>

                    {certificate ? (
                        <dl className="mt-6 divide-y divide-line border-t border-line">
                            <Row label="Awarded to" value={certificate.content.recipientName || "—"} />
                            <Row label="Event" value={certificate.content.eventTitle || "—"} />
                            <Row label="Role" value={certificate.content.role || "Attendee"} />
                            <Row label="Issued" value={formatDateMedium(certificate.issuedAt || certificate.createdAt)} />
                            <Row label="Status" value={<StatusBadge status={certificate.status} size="sm" />} />
                            <Row
                                label="Certificate ID"
                                value={<span className="break-all font-mono text-xs">{certificate.certificateId}</span>}
                            />
                        </dl>
                    ) : null}

                    {/* The link in the certificate email points here, so this is
                        where an account-less recipient collects their PDF. Signed
                        per click; the action refuses a revoked certificate. */}
                    {genuine && certificate.digital?.pdfPath ? (
                        <div className="mt-6">
                            <DownloadCertificate
                                certificateId={certificate.certificateId}
                                run={downloadCertificatePublicly}
                                label="Download the PDF"
                                align="start"
                                className={buttonClass("primary", "md")}
                            />
                        </div>
                    ) : null}

                    <p className="mt-6 text-xs text-ink-soft">
                        Verified against Avoeline&apos;s records at the moment this page loaded.
                    </p>
                </CardBody>
            </Card>

            <p className="mt-6 text-center">
                <Link href="/events" className={buttonClass("secondary", "sm")}>Browse events</Link>
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
