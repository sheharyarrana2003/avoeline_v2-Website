// app/organizer/[organizer_id]/bookings/[booking_id]/BookingDetailClient.tsx
// Client Component - interactive UI matching vendor design

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate, formatTime } from "@/src/lib/datetime";

// --- Types ---
interface Task {
    id: string;
    label: string;
    completed: boolean;
    progress?: number;
    total?: number;
    unit?: string;
}

interface Message {
    id: string;
    from: 'organizer' | 'vendor';
    senderName: string;
    text: string;
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read';
}

interface InitialData {
    bookingId: string;
    eventId: string;
    eventTitle: string;
    organizerId: string;
    vendorId: string;
    vendorName: string;
    vendorRating: number;
    vendorTotalReviews: number;
    serviceType: string;
    status: string;
    statusHistory: any[];
    requirements: {
        description: string;
        serviceDate: string;
        startTime: string;
        endTime: string;
        location: string;
        guestCount: number;
        specialInstructions: string;
    };
    quote: any;
    contract: any;
    payment: any;
    delivery: any;
    qualityCheck: any;
    communications: any[];
    documents: any;
    review: any;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    confirmedAt: string | null;
}

// --- Helper Functions ---
const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const timeAgo = (timestamp: string) => {
    if (!timestamp) return "Recently";
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        'quote_requested': 'bg-gray-100 text-gray-600',
        'quote_sent': 'bg-yellow-100 text-yellow-700',
        'quote_accepted': 'bg-blue-100 text-blue-700',
        'confirmed': 'bg-green-100 text-green-700',
        'in_progress': 'bg-purple-100 text-purple-700',
        'completed': 'bg-gray-100 text-gray-500',
        'cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

export default function BookingDetailClient({ 
    organizerId, 
    initialData 
}: { 
    organizerId: string; 
    initialData: InitialData 
}) {
    const { 
        bookingId, eventTitle, vendorName, vendorRating, vendorTotalReviews,
        serviceType, status, requirements, quote, contract, payment, 
        delivery, qualityCheck, communications, documents, completedAt 
    } = initialData;

    const currency = payment?.currency || 'PKR';

    // --- State ---
    const [tasks, setTasks] = useState<Task[]>([
        { id: '1', label: 'Finalize menu selection', completed: true },
        { id: '2', label: 'Procure hydration carafes', completed: false, progress: 8, total: 12, unit: 'Units' },
        { id: '3', label: 'Uniform deep-cleaning', completed: false },
        { id: '4', label: 'Draft floor plan', completed: true },
    ]);

    const [messages, setMessages] = useState<Message[]>(() => {
        return communications.map((comm: any, i: number) => ({
            id: `msg-${i}`,
            from: comm.from === 'organizer' ? 'organizer' : 'vendor',
            senderName: comm.from === 'organizer' ? 'You' : vendorName,
            text: comm.message,
            timestamp: comm.timestamp,
            status: 'read',
        }));
    });

    const [newMessage, setNewMessage] = useState("");

    const completedTasks = tasks.filter(t => t.completed).length;
    const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Quote breakdown items
    const breakdown = quote?.vendorQuote?.breakdown || [];
    const totalAmount = quote?.vendorQuote?.totalAmount || payment?.totalAmount || 0;

    // Payment schedule
    const paymentSchedule = payment?.paymentSchedule || [];

    // Handlers
    const toggleTask = (id: string) => {
        setTasks(prev => prev.map(t => 
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    };

    const addTask = () => {
        const label = prompt("Enter task name:");
        if (label) {
            setTasks(prev => [...prev, { 
                id: Date.now().toString(), 
                label, 
                completed: false 
            }]);
        }
    };

    const sendMessage = () => {
        if (!newMessage.trim()) return;
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            from: 'organizer',
            senderName: 'You',
            text: newMessage.trim(),
            timestamp: new Date().toISOString(),
            status: 'sent',
        }]);
        setNewMessage("");
    };

    return (
        <div className="min-h-screen bg-gray-100">
            
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href={`/organizer/${organizerId}/bookings`}
                            className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight uppercase">{eventTitle.replace(/\s/g, '')}</h1>
                            <p className="text-xs text-gray-500">Organizer: TechVerse</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(status)}`}>
                            Preparation Status
                        </span>
                        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* EVENT LOGISTICS */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Event Logistics
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dates</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatDate(requirements.serviceDate)} - {formatDate(requirements.serviceDate)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shift Times</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatTime(requirements.startTime)} — {formatTime(requirements.endTime)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</p>
                                            <p className="text-sm font-semibold text-gray-900">{requirements.location}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Person</p>
                                            <p className="text-sm font-semibold text-gray-900">Dr. Sarah Khan</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expected Guests</p>
                                            <p className="text-sm font-semibold text-gray-900">{requirements.guestCount} Attendees</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Special Instructions</p>
                                    <p className="text-sm text-gray-600 italic leading-relaxed">
                                        "{requirements.specialInstructions || 'Strict policy: No plastic bottled water. Provide glass carafes or reusable hydration stations only. All staff must wear formal black uniforms.'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* AGREED SERVICES */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Agreed Services
                                </h3>
                                <span className="text-[10px] text-gray-400 font-medium">CONTRACT #{bookingId}</span>
                            </div>

                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-y border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <div className="col-span-5">Service Item</div>
                                <div className="col-span-4">Inclusions / Status</div>
                                <div className="col-span-3 text-right">Amount (PKR)</div>
                            </div>

                            {/* Table Rows */}
                            {breakdown.length > 0 ? breakdown.map((item: any, i: number) => (
                                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 items-center">
                                    <div className="col-span-5">
                                        <p className="text-sm font-semibold text-gray-900">{item.item}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {item.quantity} {item.quantity > 1 ? 'units' : 'unit'}
                                        </p>
                                    </div>
                                    <div className="col-span-4 flex flex-wrap gap-2">
                                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Included
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total, currency).replace('PKR', '')}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-6 py-8 text-center">
                                    <p className="text-sm text-gray-400">No service items in this quote.</p>
                                </div>
                            )}

                            {/* Total Bar */}
                            <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider">Total Agreed Amount</span>
                                <span className="text-xl font-bold">{formatCurrency(totalAmount, currency)}</span>
                            </div>
                        </div>

                        {/* PREPARATION CHECKLIST */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Preparation Checklist
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">{taskProgress}% of preparation tasks completed</p>
                                </div>
                                <button 
                                    onClick={addTask}
                                    className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 hover:bg-gray-800 transition"
                                >
                                    <span>+</span> Add Task
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
                                <div 
                                    className="h-full bg-black rounded-full transition-all duration-500"
                                    style={{ width: `${taskProgress}%` }}
                                />
                            </div>

                            {/* Tasks Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {tasks.map((task) => (
                                    <button
                                        type="button"
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        aria-pressed={task.completed}
                                        className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                                            task.completed
                                                ? 'bg-gray-50 border-gray-100'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                            task.completed
                                                ? 'bg-black border-black'
                                                : 'border-gray-300'
                                        }`}>
                                            {task.completed && (
                                                <svg aria-hidden="true" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </span>
                                        {/* Spans, not divs and paragraphs: this is a
                                            <button> now, so its content has to stay
                                            phrasing content to be valid. */}
                                        <span className="flex-1 min-w-0 block">
                                            <span className={`block text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                {task.label}
                                            </span>
                                            {task.progress !== undefined && task.total && (
                                                <span className="mt-2 block">
                                                    <span className="block h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <span
                                                            className="block h-full bg-black rounded-full"
                                                            style={{ width: `${(task.progress / task.total) * 100}%` }}
                                                        />
                                                    </span>
                                                    <span className="block text-[10px] text-gray-400 mt-1">{task.progress}/{task.total} {task.unit}</span>
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* CONTRACT & AGREEMENT */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5">Contract & Agreement</h3>
                            
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">TechVerse (Client)</span>
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full uppercase">Signed</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Vendor (You)</span>
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full uppercase">Signed</span>
                                </div>
                            </div>

                            <ul className="space-y-2 mb-6">
                                <li className="text-xs text-gray-500 flex items-start gap-2">
                                    <span className="text-gray-300 mt-0.5">•</span>
                                    72h cancellation notice required
                                </li>
                                <li className="text-xs text-gray-500 flex items-start gap-2">
                                    <span className="text-gray-300 mt-0.5">•</span>
                                    Post-event cleanup included
                                </li>
                                <li className="text-xs text-gray-500 flex items-start gap-2">
                                    <span className="text-gray-300 mt-0.5">•</span>
                                    Liability coverage up to 1M PKR
                                </li>
                            </ul>

                            {contract?.contractUrl && (
                                <a 
                                    href={contract.contractUrl} 
                                    target="_blank"
                                    className="w-full block text-center bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        View Contract PDF
                                    </span>
                                </a>
                            )}
                        </div>

                        {/* PAYMENT SCHEDULE */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5">Payment Schedule</h3>
                            
                            <div className="space-y-4">
                                {paymentSchedule.map((inst: any, i: number) => (
                                    <div key={i} className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{inst.installment} Payment ({i === 0 ? '35%' : '65%'})</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {inst.status === 'paid' 
                                                    ? `Paid on ${formatDate(inst.dueDate)}` 
                                                    : `Due ${formatDate(inst.dueDate)}`
                                                }
                                            </p>
                                            {inst.status !== 'paid' && (
                                                <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">Due {formatDate(inst.dueDate)}</p>
                                            )}
                                        </div>
                                        <span className={`text-sm font-bold ${inst.status === 'paid' ? 'text-gray-900' : 'text-red-600'}`}>
                                            {formatCurrency(inst.amount, currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-5 border-2 border-black text-black py-3 rounded-xl font-bold text-sm hover:bg-black hover:text-white transition">
                                Request Early Payout
                            </button>
                        </div>

                        {/* CHAT */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    TV
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">TechVerse Admin</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                                        <span className="text-xs text-gray-400">Online</span>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.from === 'organizer' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl ${
                                            msg.from === 'organizer' 
                                                ? 'bg-black text-white rounded-br-none' 
                                                : 'bg-gray-100 text-gray-900 rounded-bl-none'
                                        }`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className={`text-[10px] mt-1 ${msg.from === 'organizer' ? 'text-gray-400' : 'text-gray-400'}`}>
                                                {msg.from === 'organizer' ? 'Delivered' : ''} • {timeAgo(msg.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type message..."
                                    className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
                                />
                                <button 
                                    onClick={sendMessage}
                                    className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition"
                                >
                                    <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}