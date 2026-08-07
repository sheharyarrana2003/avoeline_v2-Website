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
import { ConfirmButton } from '@/src/shared_components/ui/ConfirmDialog';

export interface AttendeeCertProp {
    a: Attendee;
    user: User;
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
    eventId,
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
                a.user.profile.fullName.toLowerCase().includes(q) ||
                a.user.email?.toLowerCase().includes(q),
        );
    }, [pendingAttendees, searchQuery]);

    const filteredIssuedAttendees = useMemo(() => {
        if (!searchQuery) return issuedAttendees;
        const q = searchQuery.toLowerCase();
        return issuedAttendees.filter(
            (a) =>
                a.user.profile.fullName.toLowerCase().includes(q) ||
                a.user.email?.toLowerCase().includes(q),
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

    // Progress
    const issuanceProgress =
        totalAttendees > 0 ? Math.round((issuedAttendees.length / totalAttendees) * 100) : 0;

    // Handlers
    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedAttendees(new Set());
        } else {
            setSelectedAttendees(new Set(filteredPendingAttendees.map((a) => a.a.attendeeId)));
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
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Certificate Issuance</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`${pathName}/making-template`}
                            className="bg-white border border-gray-200 text-gray-900 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition"
                        >
                            Edit Template
                        </Link>
                        <ConfirmButton
                            tone="danger"
                            title={`Issue ${selectedAttendees.size} certificate${selectedAttendees.size === 1 ? '' : 's'}?`}
                            description="Each certificate is written to the blockchain and pinned to IPFS. That is permanent and costs real resources — it cannot be undone, and re-issuing to the same attendee will not replace it."
                            confirmLabel={`Issue ${selectedAttendees.size} certificate${selectedAttendees.size === 1 ? '' : 's'}`}
                            disabled={isGenerating || selectedAttendees.size === 0}
                            busy={isGenerating}
                            onConfirm={handleGenerateClick}
                            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            {isGenerating ? 'Generating…' : 'Generate Certificates'}
                        </ConfirmButton>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Attendees</p>
                            <p className="text-3xl font-bold text-gray-900">{totalAttendees}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Already Issued</p>
                            <p className="text-3xl font-bold text-gray-900">{issuedAttendees.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending</p>
                            <p className="text-3xl font-bold text-gray-900">{pendingAttendees.length}</p>
                        </div>
                    </div>

                    {generationSummary && (
                        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                            {generationSummary}
                        </p>
                    )}
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 mb-6">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPendingPage(1);
                                setIssuedPage(1);
                            }}
                            placeholder="Search attendees..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>
                </div>

                {/* Issued Certificates Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900">Issued Certificates</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{filteredIssuedAttendees.length} certificate(s) issued</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="text-left px-6 py-3">Recipient</th>
                                    <th className="text-left px-4 py-3">Type</th>
                                    <th className="text-left px-4 py-3">Issued</th>
                                    <th className="text-left px-4 py-3">PDF</th>
                                    <th className="text-left px-4 py-3">Transaction Hash</th>
                                    <th className="text-left px-4 py-3">Social Sharing</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedIssuedAttendees.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-400">
                                            No certificates issued yet.
                                        </td>
                                    </tr>
                                )}
                                {paginatedIssuedAttendees.map((attendee) => {
                                    const cert = attendee.certStatus;
                                    const name = attendee.user.profile.fullName;
                                    const email = attendee.user.email;
                                    const status = cert?.status ?? 'issued';
                                    const isBlockchain = cert?.type === 'blockchain' || cert?.type === 'both';
                                    const isDigital = cert?.type === 'digital' || cert?.type === 'both';
                                    const social = cert?.socialSharing;

                                    return (
                                        <tr key={attendee.a.attendeeId} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                  
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {cert?.content?.recipientName || name}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-medium text-gray-700 capitalize">{cert?.type ?? '—'}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-gray-600">{formatDateMedium(cert?.issuedAt)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {isDigital && cert?.digital?.pdfUrl ? (
                                                    <a
                                                        href={cert.digital.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-semibold text-blue-600 hover:underline"
                                                    >
                                                        View PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {isBlockchain && cert?.blockchain?.transactionHash ? (
                                                    cert.blockchain.verificationUrl ? (
                                                        <a
                                                            href={cert.blockchain.verificationUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-mono text-blue-600 hover:underline"
                                                            title={cert.blockchain.transactionHash}
                                                        >
                                                            {truncateHash(cert.blockchain.transactionHash)}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs font-mono text-gray-600" title={cert.blockchain.transactionHash}>
                                                            {truncateHash(cert.blockchain.transactionHash)}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {social?.sharedOnLinkedIn && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                                            LinkedIn
                                                        </span>
                                                    )}
                                                    {social?.sharedOnTwitter && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                                                            Twitter
                                                        </span>
                                                    )}
                                                    {social?.sharedOnFacebook && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                                                            Facebook
                                                        </span>
                                                    )}
                                                    {!social?.sharedOnLinkedIn && !social?.sharedOnTwitter && !social?.sharedOnFacebook && (
                                                        <span className="text-xs text-gray-300">Not shared</span>
                                                    )}
                                                    {!!social?.shareCount && (
                                                        <span className="text-[10px] text-gray-400">({social.shareCount})</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge status={status} size="sm" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredIssuedAttendees.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                Showing {(issuedPage - 1) * ITEMS_PER_PAGE + 1}-
                                {Math.min(issuedPage * ITEMS_PER_PAGE, filteredIssuedAttendees.length)} of{' '}
                                {filteredIssuedAttendees.length} issued
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIssuedPage((p) => Math.max(1, p - 1))}
                                    disabled={issuedPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={() => setIssuedPage((p) => Math.min(issuedTotalPages, p + 1))}
                                    disabled={issuedPage === issuedTotalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pending Attendees Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Pending Attendees</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{filteredPendingAttendees.length} awaiting certificate generation</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded" />
                            Select All ({selectedAttendees.size} Selected)
                        </label>
                    </div>

                    <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
                        <div className="col-span-4">Attendee</div>
                        <div className="col-span-2">Attendance</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>

                    {paginatedPendingAttendees.length === 0 && (
                        <div className="px-6 py-8 text-center text-sm text-gray-400">No pending attendees.</div>
                    )}

                    {paginatedPendingAttendees.map((attendee) => {
                        // TODO: wire up real attendance rate once tracked
                        const attendanceRate = 0;
                        const isSelected = selectedAttendees.has(attendee.a.attendeeId);
                        const name = attendee.user.profile.fullName;
                        const email = attendee.user.email;
                        const displayStatus = resolvePendingDisplayStatus(
                            String(attendee.a.userId),
                            attendee.certStatus,
                        );

                        return (
                            <div
                                key={attendee.a.attendeeId}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-gray-50 transition ${isSelected ? 'bg-gray-50' : ''}`}
                            >
                                <div className="col-span-4 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleAttendee(attendee.a.attendeeId)}
                                        className="rounded"
                                    />
                                 
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                                        <p className="text-xs text-gray-400">{email}</p>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{attendanceRate}%</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                                            <div
                                                className={`h-full rounded-full ${attendanceRate >= 80 ? 'bg-black' : attendanceRate >= 50 ? 'bg-gray-500' : 'bg-gray-300'}`}
                                                style={{ width: `${attendanceRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                               

                                <div className="col-span-2">
                                    <div className="flex flex-col gap-1">
                                        <StatusBadge
                                            status={displayStatus.colorKey}
                                            label={displayStatus.label}
                                            size="sm"
                                            className="w-fit"
                                        />
                                        {displayStatus.detail && (
                                            <span className="text-[10px] text-red-500 line-clamp-2" title={displayStatus.detail}>
                                                {displayStatus.detail}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-2 text-right">
                                    <button className="text-gray-400 hover:text-gray-600 transition">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {filteredPendingAttendees.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                                Showing {(pendingPage - 1) * ITEMS_PER_PAGE + 1}-
                                {Math.min(pendingPage * ITEMS_PER_PAGE, filteredPendingAttendees.length)} of{' '}
                                {filteredPendingAttendees.length} pending
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                                    disabled={pendingPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
                                    disabled={pendingPage === pendingTotalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}