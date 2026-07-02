'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// --- Types ---
interface Attendee {
    attendeeId: string;
    userId: string;
    academic?: {
        university?: string;
        studentId?: string;
        department?: string;
        graduationYear?: number;
        cgpa?: number;
        isStudentVerified?: boolean;
    };
    interests?: string[];
    skills?: { name: string; level: string; endorsements: number }[];
    socialLinks?: {
        linkedin?: string | null;
        github?: string | null;
        portfolio?: string | null;
        twitter?: string | null;
    };
    stats?: {
        totalEventsAttended?: number;
        totalCertificatesEarned?: number;
        eventsRegistered?: number;
        eventsAttended?: number;
        attendanceRate?: number;
        totalHoursSpent?: number;
    };
    certificates?: {
        certificateId: string;
        eventId: string;
        issuedAt: string;
        type: string;
        verificationUrl: string;
    }[];
    connections?: any[];
    createdAt: string;
    updatedAt: string;
}

interface EventData {
    eventId: string;
    organizerId: string;
    title: string;
    description?: string;
    shortDescription?: string;
    category?: string;
    eventType?: string;
    format?: string;
    schedule?: {
        startDate?: string;
        endDate?: string;
        startTime?: string;
        endTime?: string;
        timezone?: string;
    };
    location?: {
        venueName?: string;
        address?: string;
        city?: string;
        country?: string;
    };
    bannerImage?: string;
    capacity?: {
        totalSeats?: number;
        reservedSeats?: number;
        availableSeats?: number;
    };
    certificateConfig?: {
        issueCertificates?: boolean;
        certificateType?: string;
        templateId?: string;
        requirements?: {
            minAttendance?: number;
            mustCompleteSurvey?: boolean;
        };
    };
    status?: string;
    analytics?: {
        views?: number;
        registrations?: number;
        checkIns?: number;
        completionRate?: number;
        revenue?: number;
    };
}

// --- Mock Data ---
const mockAttendees: Attendee[] = [
    {
        attendeeId: "A001",
        userId: "U001",
        academic: {
            university: "NED University of Engineering & Technology",
            studentId: "2020-CS-123",
            department: "Computer Science",
            graduationYear: 2024,
            cgpa: 3.8,
            isStudentVerified: true,
            verificationMethod: "email",
            verifiedAt: "2023-01-16T09:00:00.000Z"
        },
        interests: ["Mobile Development", "AI", "Blockchain", "Cloud Computing"],
        skills: [
            { name: "Flutter", level: "intermediate", endorsements: 12 },
            { name: "Firebase", level: "beginner", endorsements: 5 }
        ],
        socialLinks: {
            linkedin: "https://linkedin.com/in/ali-ahmed",
            github: "https://github.com/aliahmed",
            portfolio: "https://aliahmed.dev",
            twitter: null
        },
        stats: {
            totalEventsAttended: 12,
            totalCertificatesEarned: 8,
            eventsRegistered: 15,
            eventsAttended: 12,
            attendanceRate: 92.0,
            totalHoursSpent: 42
        },
        certificates: [
            {
                certificateId: "CERT001",
                eventId: "EVT001",
                issuedAt: "2025-11-20T17:00:00.000Z",
                type: "digital",
                verificationUrl: "https://verify.events.com/cert/CERT001"
            }
        ],
        connections: [],
        createdAt: "2023-01-15T08:05:00.000Z",
        updatedAt: "2026-06-10T14:20:00.000Z"
    },
    {
        attendeeId: "A002",
        userId: "U002",
        academic: {
            university: "FAST NUCES",
            studentId: "2021-SE-456",
            department: "Software Engineering",
            graduationYear: 2025,
            cgpa: 3.5,
            isStudentVerified: true,
            verificationMethod: "email",
            verifiedAt: "2023-02-10T10:00:00.000Z"
        },
        interests: ["Web Development", "DevOps", "Cloud Computing"],
        skills: [
            { name: "React", level: "advanced", endorsements: 20 },
            { name: "Docker", level: "intermediate", endorsements: 8 }
        ],
        socialLinks: {
            linkedin: "https://linkedin.com/in/jordan-chen",
            github: "https://github.com/jordanchen",
            portfolio: null,
            twitter: null
        },
        stats: {
            totalEventsAttended: 18,
            totalCertificatesEarned: 15,
            eventsRegistered: 20,
            eventsAttended: 18,
            attendanceRate: 100.0,
            totalHoursSpent: 56
        },
        certificates: [
            {
                certificateId: "CERT002",
                eventId: "EVT001",
                issuedAt: "2025-11-20T17:00:00.000Z",
                type: "blockchain",
                verificationUrl: "https://polygonscan.com/tx/0x456..."
            }
        ],
        connections: [],
        createdAt: "2023-02-10T09:00:00.000Z",
        updatedAt: "2026-06-15T11:30:00.000Z"
    },
    {
        attendeeId: "A003",
        userId: "U003",
        academic: {
            university: "IBA Karachi",
            studentId: "2020-BA-789",
            department: "Business Administration",
            graduationYear: 2024,
            cgpa: 3.2,
            isStudentVerified: false,
            verificationMethod: null,
            verifiedAt: null
        },
        interests: ["Data Science", "Product Management"],
        skills: [
            { name: "Python", level: "beginner", endorsements: 3 },
            { name: "SQL", level: "intermediate", endorsements: 7 }
        ],
        socialLinks: {
            linkedin: "https://linkedin.com/in/sarah-jenkins",
            github: null,
            portfolio: null,
            twitter: null
        },
        stats: {
            totalEventsAttended: 5,
            totalCertificatesEarned: 2,
            eventsRegistered: 10,
            eventsAttended: 5,
            attendanceRate: 45.0,
            totalHoursSpent: 18
        },
        certificates: [],
        connections: [],
        createdAt: "2023-03-20T11:00:00.000Z",
        updatedAt: "2026-06-12T09:15:00.000Z"
    },
    // Add more mock attendees...
    {
        attendeeId: "A004",
        userId: "U004",
        academic: {
            university: "LUMS",
            studentId: "2019-CS-111",
            department: "Computer Science",
            graduationYear: 2023,
            cgpa: 3.9,
            isStudentVerified: true,
            verificationMethod: "email",
            verifiedAt: "2022-09-01T08:00:00.000Z"
        },
        interests: ["AI", "Machine Learning", "Computer Vision"],
        skills: [
            { name: "PyTorch", level: "advanced", endorsements: 25 },
            { name: "TensorFlow", level: "intermediate", endorsements: 15 }
        ],
        socialLinks: {
            linkedin: "https://linkedin.com/in/fatima-khan",
            github: "https://github.com/fatimakhan",
            portfolio: "https://fatimakhan.ai",
            twitter: "https://twitter.com/fatimakhan"
        },
        stats: {
            totalEventsAttended: 25,
            totalCertificatesEarned: 20,
            eventsRegistered: 28,
            eventsAttended: 25,
            attendanceRate: 89.0,
            totalHoursSpent: 80
        },
        certificates: [
            {
                certificateId: "CERT003",
                eventId: "EVT001",
                issuedAt: "2025-11-20T17:00:00.000Z",
                type: "digital",
                verificationUrl: "https://verify.events.com/cert/CERT003"
            }
        ],
        connections: [],
        createdAt: "2022-09-01T08:00:00.000Z",
        updatedAt: "2026-06-18T16:45:00.000Z"
    }
];

const mockEvent: EventData = {
    eventId: "EVT001",
    organizerId: "U002",
    title: "TechVerse Hackathon 2026",
    description: "48-hour hackathon focused on AI and blockchain solutions",
    shortDescription: "AI & Blockchain Hackathon",
    category: "technology",
    eventType: "hackathon",
    format: "hybrid",
    schedule: {
        startDate: "2026-03-15",
        endDate: "2026-03-17",
        startTime: "09:00",
        endTime: "18:00",
        timezone: "PKT"
    },
    location: {
        venueName: "NED University Auditorium",
        address: "University Road, Karachi",
        city: "Karachi",
        country: "Pakistan"
    },
    bannerImage: "https://storage/events/banner_EVT001.jpg",
    capacity: {
        totalSeats: 250,
        reservedSeats: 3,
        availableSeats: 247
    },
    certificateConfig: {
        issueCertificates: true,
        certificateType: "both",
        templateId: "CERT_TEMPLATE_01",
        requirements: {
            minAttendance: 80,
            mustCompleteSurvey: true
        }
    },
    status: "completed",
    analytics: {
        views: 5000,
        registrations: 247,
        checkIns: 185,
        completionRate: 75.0,
        revenue: 0
    }
};

// --- Helper Functions ---
const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'issued': 'bg-blue-100 text-blue-700 border-blue-200',
        'ineligible': 'bg-red-100 text-red-700 border-red-200',
        'completed': 'bg-green-100 text-green-700 border-green-200',
        'missing': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// Determine certificate status for an attendee
const getCertificateStatus = (attendee: Attendee, eventId: string) => {
    const hasCertificate = attendee.certificates?.some(c => c.eventId === eventId);
    if (hasCertificate) return { status: 'ISSUED', label: 'ISSUED', color: 'issued' };
    
    const attendanceRate = attendee.stats?.attendanceRate || 0;
    const minAttendance = mockEvent.certificateConfig?.requirements?.minAttendance || 80;
    
    if (attendanceRate >= minAttendance) return { status: 'PENDING', label: 'PENDING', color: 'pending' };
    return { status: 'INELIGIBLE', label: 'INELIGIBLE', color: 'ineligible' };
};

// Determine survey status
const getSurveyStatus = (attendee: Attendee) => {
    // Mock logic - in real app, check if survey was completed
    const random = parseInt(attendee.attendeeId.slice(-2)) % 3;
    if (random === 0) return { status: 'COMPLETED', label: 'COMPLETED', color: 'completed' };
    if (random === 1) return { status: 'MISSING', label: 'MISSING', color: 'missing' };
    return { status: 'COMPLETED', label: 'COMPLETED', color: 'completed' };
};

export default function CertificateIssuancePage({ 
    params 
}: { 
    params: Promise<{ organizer_id: string; event_id: string }> 
}) {
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
    const itemsPerPage = 10;

    // Computed data
    const totalAttendees = mockAttendees.length;
    
    const eligibleAttendees = mockAttendees.filter(a => {
        const rate = a.stats?.attendanceRate || 0;
        const minAttendance = mockEvent.certificateConfig?.requirements?.minAttendance || 80;
        return rate >= minAttendance;
    });
    
    const alreadyIssued = mockAttendees.filter(a => 
        a.certificates?.some(c => c.eventId === mockEvent.eventId)
    );
    
    const pendingAttendees = eligibleAttendees.filter(a => 
        !a.certificates?.some(c => c.eventId === mockEvent.eventId)
    );

    // Filter and search
    const filteredAttendees = useMemo(() => {
        let filtered = mockAttendees;
        
        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(a => 
                a.userId.toLowerCase().includes(q) ||
                a.academic?.university?.toLowerCase().includes(q) ||
                a.academic?.department?.toLowerCase().includes(q)
            );
        }
        
        // Eligibility filter
        if (eligibilityFilter !== 'All') {
            filtered = filtered.filter(a => {
                const status = getCertificateStatus(a, mockEvent.eventId).status;
                return status === eligibilityFilter.toUpperCase();
            });
        }
        
        return filtered;
    }, [searchQuery, eligibilityFilter]);

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
            setSelectedAttendees(new Set(filteredAttendees.map(a => a.attendeeId)));
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

    const handleGenerateCertificates = () => {
        alert(`Generating certificates for ${selectedAttendees.size} attendees...`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{mockEvent.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">Certificate Issuance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <button 
                            onClick={handleGenerateCertificates}
                            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                        >
                            Generate Certificates
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

                    {/* Progress Bar */}
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
                    
                    {/* Left: Attendee List */}
                    <div className="lg:col-span-2 space-y-4">
                        
                        {/* Search & Filter Bar */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="flex-1 relative">
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search attendees..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                            
                            <div className="relative">
                                <select
                                    value={eligibilityFilter}
                                    onChange={(e) => setEligibilityFilter(e.target.value)}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-gray-200 pr-8"
                                >
                                    <option>All</option>
                                    <option>Eligible</option>
                                    <option>Pending</option>
                                    <option>Issued</option>
                                    <option>Ineligible</option>
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

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

                        {/* Attendees Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
                                <div className="col-span-4">Attendee</div>
                                <div className="col-span-2">Attendance</div>
                                <div className="col-span-2">Survey</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2 text-right">Action</div>
                            </div>

                            {/* Table Rows */}
                            {paginatedAttendees.map((attendee) => {
                                const certStatus = getCertificateStatus(attendee, mockEvent.eventId);
                                const surveyStatus = getSurveyStatus(attendee);
                                const attendanceRate = attendee.stats?.attendanceRate || 0;
                                const isSelected = selectedAttendees.has(attendee.attendeeId);
                                
                                // Mock name generation
                                const name = attendee.userId === 'U001' ? 'Alex Rivera' :
                                            attendee.userId === 'U002' ? 'Jordan Chen' :
                                            attendee.userId === 'U003' ? 'Sarah Jenkins' :
                                            attendee.userId === 'U004' ? 'Fatima Khan' :
                                            `User ${attendee.userId}`;
                                
                                const email = attendee.userId === 'U001' ? 'alex.r@techverse.io' :
                                             attendee.userId === 'U002' ? 'j.chen@web3.dev' :
                                             attendee.userId === 'U003' ? 'sarah.j@uxhub.com' :
                                             attendee.userId === 'U004' ? 'fatima.k@ai-labs.com' :
                                             `${attendee.userId.toLowerCase()}@example.com`;

                                return (
                                    <div 
                                        key={attendee.attendeeId}
                                        className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-gray-50 transition ${isSelected ? 'bg-gray-50' : ''}`}
                                    >
                                        {/* Attendee */}
                                        <div className="col-span-4 flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleAttendee(attendee.attendeeId)}
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

                                        {/* Attendance */}
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

                                        {/* Survey */}
                                        <div className="col-span-2">
                                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(surveyStatus.color)}`}>
                                                {surveyStatus.label}
                                            </span>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2">
                                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(certStatus.color)}`}>
                                                {certStatus.label}
                                            </span>
                                        </div>

                                        {/* Action */}
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

                            {/* Pagination */}
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
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition disabled:opacity-30"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Settings Panel */}
                    <div className="space-y-6">
                        
                        {/* Select Template */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Select Template</h3>
                            <div className="border-2 border-black rounded-xl p-4 relative cursor-pointer">
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="bg-gray-100 rounded-lg h-24 flex items-center justify-center mb-3">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Standard</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Layout</p>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 text-center">TechVerse Standard</p>
                            </div>
                        </div>

                        {/* Batch Settings */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Batch Settings</h3>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Generate all eligible</p>
                                </div>
                                <button
                                    onClick={() => setGenerateAllEligible(!generateAllEligible)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${generateAllEligible ? 'bg-black' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${generateAllEligible ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Schedule generation</p>
                                </div>
                                <button
                                    onClick={() => setScheduleGeneration(!scheduleGeneration)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${scheduleGeneration ? 'bg-black' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${scheduleGeneration ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Test mode</p>
                                </div>
                                <button
                                    onClick={() => setTestMode(!testMode)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${testMode ? 'bg-black' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${testMode ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Recipient Filter */}
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
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Issue only to checked-in</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="recipientFilter"
                                        checked={!issueToCheckedIn}
                                        onChange={() => setIssueToCheckedIn(false)}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Issue to all registrants</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}