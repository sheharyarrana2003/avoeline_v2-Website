'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Attendee } from '@/src/features/event_attendee/type';
import { User } from '@/src/services/models/user.type';
import { CertificateDocument, CertificateStatus } from '@/src/services/models/certificate.model';
import type {
    CertificateGenerationAttendeeResult,
    CertificateGenerationResult,
} from '@/src/services/models/certificate.model';
import { formatDateMedium } from '@/src/lib/datetime';
import { StatusBadge } from '@/src/shared_components/ui/StatusBadge';
import { EmptyState } from '@/src/shared_components/ui/EmptyState';
import { ConfirmButton } from '@/src/shared_components/ui/ConfirmDialog';
import { DownloadCertificate } from '@/src/features/certificates/components/DownloadCertificate';
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { buttonClass, fieldClass, tableCell, tableHead, tableRow } from '@/src/lib/ui';
import { Award, ChevronLeft, ChevronRight, Users } from 'lucide-react';

/**
 * One row, keyed on the REGISTRATION rather than an attendee profile.
 *
 * The page used to drive this list off `attendees` profile documents, which only
 * exist for people with an account -- so anybody who signed up through the
 * public form (userId "") was absent, and certificates could not be issued to
 * them at all. Every registrant has a registration id; not every registrant has
 * a profile.
 */
export interface AttendeeCertProp {
    registrationId: string;
    name: string;
    email: string;
    /** Drives the "select everyone who checked in" control (spec 6.1). */
    checkedIn: boolean;
    certStatus: CertificateDocument | null;
}

interface CertificateIssuanceClientProps {
    attendees: AttendeeCertProp[];
    eventId: string;
    onGenerateCertificates: (selectedAttendeeIds: string[]) => Promise<CertificateGenerationResult>;
}


const truncateHash = (hash?: string | null): string => {
    if (!hash) return '—';
    if (hash.length <= 14) return hash;
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
};

const ITEMS_PER_PAGE = 10;

export default function CertificateIssuanceClient({
    attendees,
    onGenerateCertificates,
}: CertificateIssuanceClientProps) {
    // State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState<boolean>(false);
    const [pendingPage, setPendingPage] = useState<number>(1);
    const [issuedPage, setIssuedPage] = useState<number>(1);
    const [isGenerating, startGenerating] = useTransition();
    const [generationResultsByUserId, setGenerationResultsByUserId] = useState<
        Record<string, CertificateGenerationAttendeeResult>
    >({});
    const [generationSummary, setGenerationSummary] = useState<string | null>(null);

    const pathName = usePathname();

    // Split attendees into issued vs. pending based on the certificate collection
    const issuedAttendees = useMemo(
        () => attendees.filter((a) => a.certStatus?.status?.toUpperCase() === ('READY' as Uppercase<CertificateStatus>)),
        [attendees],
    );

    const pendingAttendees = useMemo(
        () => attendees.filter((a) => a.certStatus?.status?.toUpperCase() !== ('READY' as Uppercase<CertificateStatus>)),
        [attendees],
    );

    const totalAttendees = attendees.length;

    // Search only applies to the pending (to-be-issued) list — selection only makes sense there
    const filteredPendingAttendees = useMemo(() => {
        if (!searchQuery) return pendingAttendees;
        const q = searchQuery.toLowerCase();
        return pendingAttendees.filter(
            (a) =>
                a.name.toLowerCase().includes(q) ||
                a.email?.toLowerCase().includes(q),
        );
    }, [pendingAttendees, searchQuery]);

    const filteredIssuedAttendees = useMemo(() => {
        if (!searchQuery) return issuedAttendees;
        const q = searchQuery.toLowerCase();
        return issuedAttendees.filter(
            (a) =>
                a.name.toLowerCase().includes(q) ||
                a.email?.toLowerCase().includes(q),
        );
    }, [issuedAttendees, searchQuery]);

    // Pagination — pending
    const pendingTotalPages = Math.max(1, Math.ceil(filteredPendingAttendees.length / ITEMS_PER_PAGE));
    const paginatedPendingAttendees = filteredPendingAttendees.slice(
        (pendingPage - 1) * ITEMS_PER_PAGE,
        pendingPage * ITEMS_PER_PAGE,
    );

    // Pagination — issued
    const issuedTotalPages = Math.max(1, Math.ceil(filteredIssuedAttendees.length / ITEMS_PER_PAGE));
    const paginatedIssuedAttendees = filteredIssuedAttendees.slice(
        (issuedPage - 1) * ITEMS_PER_PAGE,
        issuedPage * ITEMS_PER_PAGE,
    );

    // Handlers
    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedAttendees(new Set());
        } else {
            setSelectedAttendees(new Set(filteredPendingAttendees.map((a) => a.registrationId)));
        }
        setSelectAll(!selectAll);
    };

    const toggleAttendee = (id: string) => {
        const newSet = new Set(selectedAttendees);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedAttendees(newSet);
        setSelectAll(newSet.size === filteredPendingAttendees.length && newSet.size > 0);
    };

    const resolvePendingDisplayStatus = (
        userId: string,
        certStatus?: CertificateDocument | null,
    ): { label: string; colorKey: string; detail?: string } => {
        const genResult = generationResultsByUserId[userId];
        if (genResult) {
            if (!genResult.success) {
                return { label: 'failed', colorKey: 'failed', detail: genResult.error };
            }
            if (genResult.error) {
                return { label: 'ready', colorKey: 'warning', detail: genResult.error };
            }
            return { label: 'success', colorKey: 'success' };
        }
        return {
            label: certStatus?.status || 'pending',
            colorKey: certStatus?.status || 'pending',
        };
    };

    const handleGenerateClick = () => {
        if (isGenerating) return; // guard against duplicate submissions
        startGenerating(async () => {
            setGenerationSummary(null);
            try {
                const result = await onGenerateCertificates(Array.from(selectedAttendees));
                setGenerationResultsByUserId((prev) => {
                    const nextByUser = { ...prev };
                    for (const item of result.results) {
                        nextByUser[item.userId] = item;
                    }
                    return nextByUser;
                });
                setGenerationSummary(result.message);
                if (result.count > 0) {
                    setSelectedAttendees(new Set());
                    setSelectAll(false);
                }
            } catch (error: any) {
                setGenerationSummary(error?.message || 'Certificate generation failed.');
            }
        });
    };

    return (
        // No padding and no <h1>: the event layout renders the event's name, status
        // and tabs. This page is the Certificates section of it.
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <h2 className="font-display text-xl text-ink">Certificates</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`${pathName}/making-template`} className={buttonClass('secondary')}>
                        Edit template
                    </Link>
                    <ConfirmButton
                        tone="danger"
                        title={`Issue ${selectedAttendees.size} certificate${selectedAttendees.size === 1 ? '' : 's'}?`}
                        description="Each certificate is written to the blockchain and pinned to IPFS. That is permanent and costs real resources — it cannot be undone, and re-issuing to the same attendee will not replace it."
                        confirmLabel={`Issue ${selectedAttendees.size} certificate${selectedAttendees.size === 1 ? '' : 's'}`}
                        disabled={isGenerating || selectedAttendees.size === 0}
                        busy={isGenerating}
                        onConfirm={handleGenerateClick}
                        className={buttonClass('primary')}
                    >
                        {isGenerating ? 'Generating…' : 'Generate certificates'}
                    </ConfirmButton>
                </div>
            </div>

            <section className="grid grid-cols-2 gap-y-8 border-b border-line pb-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile label="Total attendees" value={`${totalAttendees}`} icon={<Users className="h-4 w-4" />} />
                <MetricTile
                    label="Already issued"
                    value={`${issuedAttendees.length}`}
                    icon={<Award className="h-4 w-4" />}
                    sublabel={
                        totalAttendees > 0
                            ? `${Math.round((issuedAttendees.length / totalAttendees) * 100)}% of attendees`
                            : "No attendees yet"
                    }
                />
                <MetricTile
                    label="Pending"
                    value={`${pendingAttendees.length}`}
                    sublabel="Awaiting issuance"
                />
            </section>

            {generationSummary && (
                <p className="mt-6 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink">
                    {generationSummary}
                </p>
            )}

            <div className="mt-8">
                <input
                    type="search"
                    value={searchQuery}
                    aria-label="Search attendees"
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPendingPage(1);
                        setIssuedPage(1);
                    }}
                    placeholder="Search attendees by name or email"
                    className={`${fieldClass} sm:max-w-sm`}
                />
            </div>

            {/* Issued */}
            <section className="mt-10">
                <div className="mb-4 border-b border-line pb-2">
                    <h3 className="font-display text-lg text-ink">Issued certificates</h3>
                    <p className="text-xs text-ink-soft tabular-nums">{filteredIssuedAttendees.length} issued</p>
                </div>

                {paginatedIssuedAttendees.length === 0 ? (
                    <EmptyState
                        size="sm"
                        icon={<Award className="h-5 w-5" />}
                        title={searchQuery ? 'No issued certificates match that search' : 'Nothing issued yet'}
                        description={
                            searchQuery
                                ? 'Try part of a name or email address.'
                                : 'Select attendees below and generate their certificates — they will be listed here once written to the chain.'
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-3xl">
                            <thead>
                                <tr>
                                    <th className={tableHead}>Recipient</th>
                                    <th className={tableHead}>Type</th>
                                    <th className={tableHead}>Issued</th>
                                    <th className={tableHead}>PDF</th>
                                    <th className={tableHead}>Verify</th>
                                    <th className={tableHead}>Transaction hash</th>
                                    <th className={tableHead}>Sharing</th>
                                    <th className={`${tableHead} pr-0 text-right`}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedIssuedAttendees.map((attendee) => {
                                    const cert = attendee.certStatus;
                                    const name = attendee.name;
                                    const email = attendee.email;
                                    const status = cert?.status ?? 'issued';
                                    const isBlockchain = cert?.type === 'blockchain' || cert?.type === 'both';
                                    const isDigital = cert?.type === 'digital' || cert?.type === 'both';
                                    const social = cert?.socialSharing;
                                    const sharedOn = [
                                        social?.sharedOnLinkedIn && 'LinkedIn',
                                        social?.sharedOnTwitter && 'Twitter',
                                        social?.sharedOnFacebook && 'Facebook',
                                    ].filter(Boolean) as string[];

                                    return (
                                        <tr key={attendee.registrationId} className={tableRow}>
                                            <td className={tableCell}>
                                                <p className="font-medium text-ink">{cert?.content?.recipientName || name}</p>
                                                <p className="text-xs text-ink-soft">{email}</p>
                                            </td>
                                            <td className={`${tableCell} capitalize`}>{cert?.type ?? '—'}</td>
                                            {/* issuedAt is only set on the blockchain path, so a digital certificate
    showed an em dash for a date it definitely has. */}
                                            <td className={`${tableCell} tabular-nums`}>{formatDateMedium(cert?.issuedAt || cert?.createdAt)}</td>
                                            <td className={tableCell}>
                                                {/* A signed download, not an href. `digital.pdfUrl` used
                                                    to be rendered here and was a fabricated
                                                    storage.eventflow.com address on every certificate --
                                                    a live link to a domain nobody owns. The real file is
                                                    in a private bucket and its URL is signed per click. */}
                                                {cert?.digital?.pdfPath ? (
                                                    <DownloadCertificate certificateId={cert.certificateId} label="PDF" />
                                                ) : (
                                                    <span className="text-ink-faint" aria-hidden="true">—</span>
                                                )}
                                            </td>
                                            <td className={tableCell}>
                                                {cert?.certificateId ? (
                                                    <a
                                                        href={`/verify/${cert.certificateId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-ink hover:underline"
                                                    >
                                                        Check
                                                    </a>
                                                ) : (
                                                    <span className="text-ink-faint" aria-hidden="true">—</span>
                                                )}
                                            </td>
                                            <td className={`${tableCell} font-mono text-xs`}>
                                                {isBlockchain && cert?.blockchain?.transactionHash ? (
                                                    cert.blockchain.verificationUrl ? (
                                                        <a
                                                            href={cert.blockchain.verificationUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-ink hover:underline"
                                                            title={cert.blockchain.transactionHash}
                                                        >
                                                            {truncateHash(cert.blockchain.transactionHash)}
                                                        </a>
                                                    ) : (
                                                        <span className="text-ink-soft" title={cert.blockchain.transactionHash}>
                                                            {truncateHash(cert.blockchain.transactionHash)}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-ink-faint" aria-hidden="true">—</span>
                                                )}
                                            </td>
                                            <td className={`${tableCell} text-xs text-ink-soft`}>
                                                {sharedOn.length ? (
                                                    <>
                                                        {sharedOn.join(', ')}
                                                        {social?.shareCount ? <span className="tabular-nums"> ({social.shareCount})</span> : null}
                                                    </>
                                                ) : (
                                                    'Not shared'
                                                )}
                                            </td>
                                            <td className={`${tableCell} pr-0 text-right`}>
                                                <StatusBadge status={status} size="sm" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredIssuedAttendees.length > ITEMS_PER_PAGE && (
                    <Pager
                        page={issuedPage}
                        totalPages={issuedTotalPages}
                        total={filteredIssuedAttendees.length}
                        noun="issued"
                        onChange={setIssuedPage}
                    />
                )}
            </section>

            {/* Pending */}
            <section className="mt-10">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2">
                    <div>
                        <h3 className="font-display text-lg text-ink">Pending attendees</h3>
                        <p className="text-xs text-ink-soft tabular-nums">{filteredPendingAttendees.length} awaiting generation</p>
                    </div>
                    {filteredPendingAttendees.length > 0 && (
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded-xs accent-gray-900" />
                            Select all (<span className="tabular-nums">{selectedAttendees.size}</span> selected)
                        </label>
                    )}
                </div>

                {paginatedPendingAttendees.length === 0 ? (
                    <EmptyState
                        size="sm"
                        icon={<Users className="h-5 w-5" />}
                        title={searchQuery ? 'No pending attendees match that search' : 'Everyone has a certificate'}
                        description={
                            searchQuery
                                ? 'Try part of a name or email address.'
                                : 'Nobody on this event is waiting on a certificate right now.'
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={`${tableHead} w-10`}><span className="sr-only">Select</span></th>
                                    <th className={tableHead}>Attendee</th>
                                    {/* The "Attendance" column used to render a bar hardcoded to 0%
                                        for every row, over a TODO. A number nobody measured is
                                        worse than no column. */}
                                    <th className={`${tableHead} pr-0 text-right`}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPendingAttendees.map((attendee) => {
                                    const isSelected = selectedAttendees.has(attendee.registrationId);
                                    const name = attendee.name;
                                    const email = attendee.email;
                                    const displayStatus = resolvePendingDisplayStatus(
                                        attendee.registrationId,
                                        attendee.certStatus,
                                    );

                                    return (
                                        <tr key={attendee.registrationId} className={`${tableRow} ${isSelected ? 'bg-muted' : ''}`}>
                                            <td className={tableCell}>
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Select ${name}`}
                                                    checked={isSelected}
                                                    onChange={() => toggleAttendee(attendee.registrationId)}
                                                    className="rounded-xs accent-gray-900"
                                                />
                                            </td>
                                            <td className={tableCell}>
                                                <p className="font-medium text-ink">{name}</p>
                                                <p className="text-xs text-ink-soft">{email}</p>
                                            </td>
                                            <td className={`${tableCell} pr-0 text-right`}>
                                                <StatusBadge status={displayStatus.colorKey} label={displayStatus.label} size="sm" />
                                                {displayStatus.detail && (
                                                    <p className="mt-1 line-clamp-2 text-2xs text-ink-soft" title={displayStatus.detail}>
                                                        {displayStatus.detail}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredPendingAttendees.length > ITEMS_PER_PAGE && (
                    <Pager
                        page={pendingPage}
                        totalPages={pendingTotalPages}
                        total={filteredPendingAttendees.length}
                        noun="pending"
                        onChange={setPendingPage}
                    />
                )}
            </section>
        </div>
    );
}

function Pager({
    page,
    totalPages,
    total,
    noun,
    onChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    noun: string;
    onChange: (updater: (p: number) => number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
            <p className="text-xs text-ink-soft tabular-nums">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} {noun}
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => onChange((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={buttonClass('ghost', 'sm', 'px-2')}
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => onChange((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={buttonClass('ghost', 'sm', 'px-2')}
                >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
