'use client';

import { useState, useMemo, useTransition } from 'react';
import { Attendee } from '@/src/features/event_attendee/type';
import { User } from '@/src/services/models/user.type';
import { CertificateDocument } from '@/src/services/models/certificate.model';

export interface AttendeeCertProp {
    a: Attendee;
    user: User;
    certStatus: CertificateDocument|null;
}

interface CertificateIssuanceClientProps {
    attendees: AttendeeCertProp[];
    eventId: string;
    onGenerateCertificates: (selectedAttendeeIds: string[]) => Promise<void>;
}

// --- Helper Functions ---
const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Updated to accurately reflect the design tokens for CertificateStatus values
const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        'generating': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'ready': 'bg-purple-100 text-purple-700 border-purple-200',
        'issued': 'bg-green-100 text-green-700 border-green-200',
        'revoked': 'bg-red-100 text-red-700 border-red-200',
        'pending': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// Survey status helper remains mapped to UI design tokens
const getSurveyStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        'completed': 'bg-green-100 text-green-700 border-green-200',
        'missing': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// Survey status is still mocked — replace when real survey data exists
const getSurveyStatus = (attendee: Attendee) => {
    const random = parseInt(attendee.attendeeId.slice(-2)) || 0;
    if (random % 3 === 0) return { status: 'COMPLETED', label: 'COMPLETED', color: 'completed' };
    if (random % 3 === 1) return { status: 'MISSING', label: 'MISSING', color: 'missing' };
    return { status: 'COMPLETED', label: 'COMPLETED', color: 'completed' };
};

export default function CertificateIssuanceClient({
    attendees,
    eventId,
    onGenerateCertificates,
}: CertificateIssuanceClientProps) {

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [eligibilityFilter, setEligibilityFilter] = useState('All');
    const [generateAllEligible, setGenerateAllEligible] = useState(true);
    const [scheduleGeneration, setScheduleGeneration] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const [issueToCheckedIn, setIssueToCheckedIn] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isGenerating, startGenerating] = useTransition();
    const itemsPerPage = 10;

    // Computed data
    const totalAttendees = attendees.length;

    const minAttendance = 80; // TODO: pull from event.certificateConfig.requirements.minAttendance
    const eligibleAttendees = attendees.filter(a => {
          //!fix
        const rate = 0;
        return rate >= minAttendance;
    });

    // Modified fallback handling in case certStatus or status field hasn't loaded yet
    const alreadyIssued = attendees.filter(a => a.certStatus?.status?.toUpperCase() === 'ISSUED');
    const pendingAttendees = eligibleAttendees.filter(a => a.certStatus?.status?.toUpperCase() !== 'ISSUED');

    // Filter and search
    const filteredAttendees = useMemo(() => {
        let filtered = attendees;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.user.profile.fullName.toLowerCase().includes(q) ||
                a.user.email?.toLowerCase().includes(q)
            );
        }

        if (eligibilityFilter !== 'All') {
            filtered = filtered.filter(a => a.certStatus?.status?.toUpperCase() === eligibilityFilter.toUpperCase());
        }

        return filtered;
    }, [attendees, searchQuery, eligibilityFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
    const paginatedAttendees = filteredAttendees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Progress
    const issuanceProgress = eligibleAttendees.length > 0
        ? Math.round((alreadyIssued.length / eligibleAttendees.length) * 100)
        : 0;

    // Handlers
    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedAttendees(new Set());
        } else {
            setSelectedAttendees(new Set(filteredAttendees.map(a => a.a.attendeeId)));
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
        setSelectAll(newSet.size === filteredAttendees.length);
    };

    const handleGenerateClick = () => {
        if (isGenerating) return; // guard against duplicate submissions
        startGenerating(async () => {
            await onGenerateCertificates(Array.from(selectedAttendees));
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Certificate Issuance</h1>
                        <p className="text-sm text-gray-500 mt-1">Event ID: {eventId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGenerateClick}
                            disabled={isGenerating}
                            aria-busy={isGenerating}
                            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'Generating…' : 'Generate Certificates'}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Attendees</p>
                            <p className="text-3xl font-bold text-gray-900">{totalAttendees}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Eligible</p>
                            <p className="text-3xl font-bold text-gray-900">{eligibleAttendees.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Already Issued</p>
                            <p className="text-3xl font-bold text-gray-900">{alreadyIssued.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending</p>
                            <p className="text-3xl font-bold text-gray-900">{pendingAttendees.length}</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-700">Issuance Progress</p>
                            <p className="text-xs font-bold text-gray-900">{issuanceProgress}%</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-black rounded-full transition-all duration-500"
                                style={{ width: `${issuanceProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {alreadyIssued.length} of {eligibleAttendees.length} eligible certificates have been distributed
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    <div className="lg:col-span-2 space-y-4">

                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search attendees..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>

                            <select
                                value={eligibilityFilter}
                                onChange={(e) => setEligibilityFilter(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                <option value="All">All</option>
                                <option value="Generating">Generating</option>
                                <option value="Ready">Ready</option>
                                <option value="Issued">Issued</option>
                                <option value="Revoked">Revoked</option>
                            </select>

                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={toggleSelectAll}
                                    className="rounded"
                                />
                                Select All ({selectedAttendees.size} Selected)
                            </label>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
                                <div className="col-span-4">Attendee</div>
                                <div className="col-span-2">Attendance</div>
                                <div className="col-span-2">Survey</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>

                            {paginatedAttendees.map((attendee) => {
                                const surveyStatus = getSurveyStatus(attendee.a);
                                //!fix
                                const attendanceRate =  0;
                                const isSelected = selectedAttendees.has(attendee.a.attendeeId);
                                const name = attendee.user.profile.fullName;
                                const email = attendee.user.email;
                                
                                // Clean dynamic parsing mapping fallback for cases where no cert record exists yet
                                const currentCertStatus = attendee.certStatus?.status || 'pending';

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
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                <span className="text-sm font-bold text-gray-600">{getInitials(name)}</span>
                                            </div>
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
                                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getSurveyStatusColor(surveyStatus.color)}`}>
                                                {surveyStatus.label}
                                            </span>
                                        </div>

                                        {/* Status Column Hooked Directly into Schema Property */}
                                        <div className="col-span-2">
                                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(currentCertStatus)}`}>
                                                {currentCertStatus}
                                            </span>
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

                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400">
                                    Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAttendees.length)} of {filteredAttendees.length} attendees
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Settings Panel */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Batch Settings</h3>

                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700">Generate all eligible</p>
                                <button
                                    onClick={() => setGenerateAllEligible(!generateAllEligible)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${generateAllEligible ? 'bg-black' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${generateAllEligible ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700">Schedule generation</p>
                                <button
                                    onClick={() => setScheduleGeneration(!scheduleGeneration)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${scheduleGeneration ? 'bg-black' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${scheduleGeneration ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-700">Test mode</p>
                                <button
                                    onClick={() => setTestMode(!testMode)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${testMode ? 'bg-black' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${testMode ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recipient Filter</p>

                                <label className="flex items-start gap-3 cursor-pointer mb-3">
                                    <input
                                        type="radio"
                                        name="recipientFilter"
                                        checked={issueToCheckedIn}
                                        onChange={() => setIssueToCheckedIn(true)}
                                        className="mt-0.5"
                                    />
                                    <p className="text-sm font-medium text-gray-700">Issue only to checked-in</p>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="recipientFilter"
                                        checked={!issueToCheckedIn}
                                        onChange={() => setIssueToCheckedIn(false)}
                                        className="mt-0.5"
                                    />
                                    <p className="text-sm font-medium text-gray-700">Issue to all registrants</p>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}