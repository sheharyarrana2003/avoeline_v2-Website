'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EventFormData } from '@/src/services/models/event.model';
import { CustomField } from '@/src/services/models/event.model';

// --- Constants ---
const EVENT_TYPES = [
    { id: 'hackathon', label: 'Hackathon', sub: 'Coding marathon', icon: '💻' },
    { id: 'workshop', label: 'Workshop', sub: 'Hands-on learning', icon: '🛠️' },
    { id: 'seminar', label: 'Seminar', sub: 'Expert talks', icon: '🎓' },
    { id: 'conference', label: 'Conference', sub: 'Grand gathering', icon: '👥' },
    { id: 'webinar', label: 'Webinar', sub: 'Online session', icon: '🖥️' },
    { id: 'networking', label: 'Networking', sub: 'Professional mixer', icon: '🤝' },
    { id: 'training', label: 'Training', sub: 'Skill building', icon: '📚' },
    { id: 'custom', label: 'Custom', sub: 'Tailored format', icon: '➕' },
];

const CATEGORIES = [
    'Technology & Innovation',
    'Business & Entrepreneurship',
    'Arts & Culture',
    'Health & Wellness',
    'Education',
    'Sports & Fitness',
    'Food & Beverage',
    'Music & Entertainment',
];

const TIMEZONES = [
    'Pakistan Standard Time (PKT, UTC+5)',
    'Pacific Daylight Time (PDT, UTC-7)',
    'Eastern Daylight Time (EDT, UTC-4)',
    'Greenwich Mean Time (GMT, UTC+0)',
    'Central European Time (CET, UTC+1)',
];

const STEPS = [
    { id: 1, label: 'Basic Information', key: 'basic' },
    { id: 2, label: 'Schedule & Location', key: 'schedule' },
    { id: 3, label: 'Registration & Tickets', key: 'registration' },
    { id: 4, label: 'Review & Publish', key: 'review' },
];

const INITIAL_FORM: EventFormData = {
    eventType: '',
    eventTitle: '',
    description: '',
    category: 'Technology & Innovation',
    shortDescription: '',
    tags: [],
    bannerImage: null,
    galleryImages: [],
    videoUrl: '',
    dietaryOptions: [],

    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '17:00',
    isAllDay: false,
    timezone: 'Pakistan Standard Time (PKT, UTC+5)',
    isRecurring: false,
    recurrenceType: 'daily',
    locationType: 'physical',
    venueName: '',
    address: '',
    city: 'Lahore',
    postalCode: '',
    coordinates: { lat: 31.5204, lng: 74.3587 },
    totalSeats: 100,
    reservedSeats: 10,
    enableWaitingList: false,

    ticketType: 'paid',
    ticketTiers: [
        { id: '1', name: 'Early Bird Pass', price: 4500, seatsAvailable: 100, availableUntil: '2024-12-01', benefits: 'VIP Lounge Access, Fast Track Entry' },
    ],
    studentDiscount: false,
    studentDiscountPercent: 15,
    groupDiscount: false,
    groupDiscountPercent: 10,
    promoCodes: [],
    customFields: [
        { id: '1', label: 'Years of Experience', type: 'dropdown', options: ['0-2', '3-5', '5+'], required: false },
        { id: '2', label: 'Identity Proof (ID/Passport)', type: 'file', required: false },
    ],
    requiresApproval: false,
    maxTicketsPerPerson: 4,

    visibility: 'public',
    publishImmediately: true,
    agreeToTerms: false,
    confirmRights: false,
};

export default function CreateEventPage({ handle_submission }: any) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM);
    const [tagInput, setTagInput] = useState('');
    const [newTier, setNewTier] = useState({ name: '', price: 0, seatsAvailable: 0, availableUntil: '', benefits: '' });

    const handling_submission_client = (formData: EventFormData) => {
        handle_submission(formData);
    }
    const updateForm = (field: keyof EventFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            updateForm('tags', [...formData.tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        updateForm('tags', formData.tags.filter(t => t !== tag));
    };

    const addTicketTier = () => {
        if (newTier.name) {
            updateForm('ticketTiers', [...formData.ticketTiers, { ...newTier, id: Date.now().toString() }]);
            setNewTier({ name: '', price: 0, seatsAvailable: 0, availableUntil: '', benefits: '' });
        }
    };

    const removeTicketTier = (id: string) => {
        updateForm('ticketTiers', formData.ticketTiers.filter(t => t.id !== id));
    };

    const addCustomField = () => {
        const newField: CustomField = {
            id: Date.now().toString(),
            label: 'New Field',
            type: 'text',
            required: false,
        };
        updateForm('customFields', [...formData.customFields, newField]);
    };

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const goToStep = (step: number) => {
        if (step <= currentStep) setCurrentStep(step);
    };

    const completionPercent = Math.round((currentStep / 4) * 100);

    // --- Step 1: Basic Information ---
    const renderStep1 = () => (
        <div className="space-y-8">
            {/* Event Type Selection */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Event Type</h3>
                <p className="text-sm text-gray-500 mb-4">Select the format that best fits your event structure.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {EVENT_TYPES.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => updateForm('eventType', type.id)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${formData.eventType === type.id
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                        >
                            <div className="text-2xl mb-2">{type.icon}</div>
                            <div className="font-semibold text-sm text-gray-900">{type.label}</div>
                            <div className="text-xs text-gray-400">{type.sub}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: General Info */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">General Info</h3>
                        <p className="text-sm text-gray-500 mb-4">The essential details displayed on the event page.</p>
                    </div>

                    {/* Event Title */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Event Title <span className="float-right text-gray-400 font-normal">{formData.eventTitle.length}/100</span>
                        </label>
                        <input
                            type="text"
                            value={formData.eventTitle}
                            onChange={(e) => updateForm('eventTitle', e.target.value)}
                            placeholder="Global AI Innovation Summit 2024"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                                <button className="p-1 hover:bg-gray-200 rounded text-xs font-bold">B</button>
                                <button className="p-1 hover:bg-gray-200 rounded text-xs italic">I</button>
                                <button className="p-1 hover:bg-gray-200 rounded text-xs">≡</button>
                                <button className="p-1 hover:bg-gray-200 rounded text-xs">🔗</button>
                                <button className="p-1 hover:bg-gray-200 rounded text-xs">🖼</button>
                            </div>
                            <textarea
                                value={formData.description}
                                onChange={(e) => updateForm('description', e.target.value)}
                                placeholder="Tell your attendees what to expect..."
                                rows={4}
                                className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                        <div className="relative">
                            <select
                                value={formData.category}
                                onChange={(e) => updateForm('category', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Short Description */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Short Description</label>
                        <input
                            type="text"
                            value={formData.shortDescription}
                            onChange={(e) => updateForm('shortDescription', e.target.value)}
                            placeholder="A catchphrase for social sharing"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Tags</label>
                        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                            {formData.tags.map(tag => (
                                <span key={tag} className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-600">×</button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder="Add tag..."
                                className="flex-1 text-sm outline-none min-w-[80px] py-1"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Media & Registration */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Media Assets</h3>
                        <p className="text-sm text-gray-500 mb-4">High-quality visuals increase engagement.</p>
                    </div>

                    {/* Banner Upload */}
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-gray-300 transition cursor-pointer">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Upload Event Banner</p>
                        <p className="text-xs text-gray-400 mt-1">1600 × 900px recommended (JPG, PNG)</p>
                    </div>

                    {/* Gallery */}
                    <div className="flex items-center gap-3">
                        <button className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center hover:border-gray-300 transition">
                            <span className="text-gray-400 text-lg">+</span>
                        </button>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                            </div>
                        ))}
                    </div>

                    {/* Video URL */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Video Promo URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.videoUrl}
                                onChange={(e) => updateForm('videoUrl', e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                            />
                            <button className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition">
                                Preview
                            </button>
                        </div>
                    </div>

                    {/* Registration Form */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-gray-900">Registration Form</h4>
                                <p className="text-xs text-gray-400">Design your attendee intake form.</p>
                            </div>
                            <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-4">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-xs text-gray-500">Standard Fields (Name, Email, Phone)</span>
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-auto">REQUIRED</span>
                        </div>

                        {/* Dietary Options */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['Vegetarian', 'Vegan', 'Gluten-Free'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => {
                                        const current = formData.dietaryOptions;
                                        updateForm('dietaryOptions',
                                            current.includes(opt)
                                                ? current.filter(o => o !== opt)
                                                : [...current, opt]
                                        );
                                    }}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${formData.dietaryOptions.includes(opt)
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-600 border-gray-200'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                            <button className="text-xs font-medium px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-gray-400">
                                + Add option
                            </button>
                        </div>

                        {/* Custom Fields */}
                        {formData.customFields.map((field, i) => (
                            <div key={field.id} className="bg-gray-50 rounded-xl p-3 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">📝</span>
                                    <div>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                                {
                                                    formData.customFields.map(x => {
                                                        if (x.id === field.id) {
                                                            field.label = e.target.value;
                                                        }
                                                        return x;
                                                    })

                                                    updateForm('customFields', formData.customFields);
                                                }
                                            }}


                                            className="w-full bg-transparent text-sm text-gray-900 outline-none"
                                        />
                                        <button  className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition" onClick={(e) => {
                                            {
                                                formData.customFields.map(x => {
                                                    if (x.id === field.id) {
                                                        field.required = !field.required;
                                                    }
                                                    return x;
                                                })

                                                updateForm('customFields', formData.customFields);
                                            }
                                        }}>Required</button>
                                        <p className="text-[10px] text-gray-400">
                                            {field.type === 'dropdown' ? `Dropdown List • ${field.options?.length} Options` : field.type}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{field.required ? "REQUIRED" : "" }</span>
                            </div>
                        ))}

                        <button
                            onClick={addCustomField}
                            className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-300 transition flex items-center justify-center gap-1"
                        >
                            <span>+</span> Add Custom Field
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Step 2: Schedule & Location ---
    const renderStep2 = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Event Schedule */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-900">Event Schedule</h3>
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">Start Date</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.startDate}
                                onChange={(e) => updateForm('startDate', e.target.value)}
                                placeholder="mm/dd/yyyy"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">End Date</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.endDate}
                                onChange={(e) => updateForm('endDate', e.target.value)}
                                placeholder="mm/dd/yyyy"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={formData.startDate === formData.endDate} onChange={() => { }} className="rounded" />
                        Same as start date
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={formData.isAllDay} onChange={(e) => updateForm('isAllDay', e.target.checked)} className="rounded" />
                        All-day event
                    </label>
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">Start Time</label>
                        <div className="relative">
                            <select
                                value={formData.startTime}
                                onChange={(e) => updateForm('startTime', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                <option>10:00 AM</option>
                                <option>11:00 AM</option>
                                <option>12:00 PM</option>
                                <option>01:00 PM</option>
                                <option>02:00 PM</option>
                            </select>
                            <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">End Time</label>
                        <div className="relative">
                            <select
                                value={formData.endTime}
                                onChange={(e) => updateForm('endTime', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                <option>05:00 PM</option>
                                <option>06:00 PM</option>
                                <option>07:00 PM</option>
                                <option>08:00 PM</option>
                            </select>
                            <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Total duration: 7 hours
                    </span>
                    <div className="flex gap-2">
                        <button className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">12h</button>
                        <button className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">24h</button>
                    </div>
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-xs text-gray-500 mb-2">Timezone</label>
                    <div className="relative">
                        <select
                            value={formData.timezone}
                            onChange={(e) => updateForm('timezone', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                        >
                            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                {/* Recurring Event */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Recurring Event</span>
                    </div>
                    <button
                        onClick={() => updateForm('isRecurring', !formData.isRecurring)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${formData.isRecurring ? 'bg-black' : 'bg-gray-300'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.isRecurring ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                {formData.isRecurring && (
                    <div className="flex gap-2">
                        {['Daily', 'Weekly', 'Monthly', 'Custom'].map(type => (
                            <button
                                key={type}
                                onClick={() => updateForm('recurrenceType', type.toLowerCase())}
                                className={`px-4 py-2 rounded-full text-xs font-medium transition ${formData.recurrenceType === type.toLowerCase()
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}

                {formData.isRecurring && (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-gray-700">Quick Summary</p>
                            <p className="text-xs text-gray-500 mt-1">Occurs every day starting March 12, 2026 until March 19, 2026. Starts at 10:00 AM and ends at 05:00 PM PKT.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Event Location */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-900">Event Location</h3>
                </div>

                {/* Location Type */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'physical', label: 'Physical', icon: '📍' },
                        { id: 'virtual', label: 'Virtual', icon: '💻' },
                        { id: 'hybrid', label: 'Hybrid', icon: '🌐' },
                    ].map(loc => (
                        <button
                            key={loc.id}
                            onClick={() => updateForm('locationType', loc.id)}
                            className={`p-4 rounded-2xl border-2 text-center transition-all ${formData.locationType === loc.id
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                        >
                            <div className="text-2xl mb-1">{loc.icon}</div>
                            <div className="text-xs font-medium text-gray-700">{loc.label}</div>
                        </button>
                    ))}
                </div>

                {/* Venue Details */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">Venue Name</label>
                        <input
                            type="text"
                            value={formData.venueName}
                            onChange={(e) => updateForm('venueName', e.target.value)}
                            placeholder="e.g. Grand Convention Center"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-2">Address</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => updateForm('address', e.target.value)}
                                placeholder="Start typing address..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-2">City</label>
                            <div className="relative">
                                <select
                                    value={formData.city}
                                    onChange={(e) => updateForm('city', e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gray-200"
                                >
                                    <option>Lahore</option>
                                    <option>Karachi</option>
                                    <option>Islamabad</option>
                                    <option>Rawalpindi</option>
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-2">Postal Code</label>
                            <input
                                type="text"
                                value={formData.postalCode}
                                onChange={(e) => updateForm('postalCode', e.target.value)}
                                placeholder="54000"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Map Placeholder */}
                <div className="relative h-48 bg-gray-200 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
                        </svg>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-white rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm flex items-center gap-1">
                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {formData.coordinates.lat}°N, {formData.coordinates.lng}°E
                    </div>
                </div>

                {/* Capacity */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-sm font-bold text-gray-900">Capacity & Availability</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-2">Total Seats</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateForm('totalSeats', Math.max(0, formData.totalSeats - 1))}
                                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >-</button>
                                <input
                                    type="number"
                                    value={formData.totalSeats}
                                    onChange={(e) => updateForm('totalSeats', parseInt(e.target.value) || 0)}
                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center text-gray-900 outline-none"
                                />
                                <button
                                    onClick={() => updateForm('totalSeats', formData.totalSeats + 1)}
                                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >+</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-2">Reserved Seats</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateForm('reservedSeats', Math.max(0, formData.reservedSeats - 1))}
                                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >-</button>
                                <input
                                    type="number"
                                    value={formData.reservedSeats}
                                    onChange={(e) => updateForm('reservedSeats', parseInt(e.target.value) || 0)}
                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center text-gray-900 outline-none"
                                />
                                <button
                                    onClick={() => updateForm('reservedSeats', formData.reservedSeats + 1)}
                                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >+</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Enable Waiting List</p>
                            <p className="text-xs text-gray-400">Allows guests to join queue if seats are full</p>
                        </div>
                        <button
                            onClick={() => updateForm('enableWaitingList', !formData.enableWaitingList)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${formData.enableWaitingList ? 'bg-black' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.enableWaitingList ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Step 3: Registration & Tickets ---
    const renderStep3 = () => (
        <div className="space-y-8">
            {/* Ticket Type Selection */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-sm font-medium text-gray-700 text-center mb-4">Select Ticket Type</p>
                <div className="flex justify-center">
                    <div className="bg-gray-100 rounded-xl p-1 flex">
                        <button
                            onClick={() => updateForm('ticketType', 'free')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${formData.ticketType === 'free'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500'
                                }`}
                        >
                            Free
                        </button>
                        <button
                            onClick={() => updateForm('ticketType', 'paid')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${formData.ticketType === 'paid'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-gray-500'
                                }`}
                        >
                            Paid
                        </button>
                    </div>
                </div>
            </div>

            {/* Ticket Tiers */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <h3 className="font-bold text-gray-900">Ticket Tiers</h3>
                </div>

                <div className="space-y-4">
                    {formData.ticketTiers.map((tier) => (
                        <div key={tier.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tier Name</label>
                                    <input
                                        type="text"
                                        value={tier.name}
                                        onChange={(e) => {
                                            const updated = formData.ticketTiers.map(t =>
                                                t.id === tier.id ? { ...t, name: e.target.value } : t
                                            );
                                            updateForm('ticketTiers', updated);
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">PKR</span>
                                        <input
                                            type="number"
                                            value={tier.price}
                                            onChange={(e) => {
                                                const updated = formData.ticketTiers.map(t =>
                                                    t.id === tier.id ? { ...t, price: parseInt(e.target.value) || 0 } : t
                                                );
                                                updateForm('ticketTiers', updated);
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Seats Available</label>
                                    <input
                                        type="number"
                                        value={tier.seatsAvailable}
                                        onChange={(e) => {
                                            const updated = formData.ticketTiers.map(t =>
                                                t.id === tier.id ? { ...t, seatsAvailable: parseInt(e.target.value) || 0 } : t
                                            );
                                            updateForm('ticketTiers', updated);
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <button
                                        onClick={() => removeTicketTier(tier.id)}
                                        className="text-gray-400 hover:text-red-500 transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Available Until</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={tier.availableUntil}
                                            onChange={(e) => {
                                                const updated = formData.ticketTiers.map(t =>
                                                    t.id === tier.id ? { ...t, availableUntil: e.target.value } : t
                                                );
                                                updateForm('ticketTiers', updated);
                                            }}
                                            placeholder="12/01/2024"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                                        />
                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ticket Benefits</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={tier.benefits}
                                            onChange={(e) => {
                                                const updated = formData.ticketTiers.map(t =>
                                                    t.id === tier.id ? { ...t, benefits: e.target.value } : t
                                                );
                                                updateForm('ticketTiers', updated);
                                            }}
                                            placeholder="VIP Lounge Access, Fast Track Entry..."
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200 pl-10"
                                        />
                                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => setNewTier({ name: '', price: 0, seatsAvailable: 0, availableUntil: '', benefits: '' })}
                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-300 transition flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Another Ticket Tier
                    </button>
                </div>
            </div>

            {/* Discounts */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V4a4 4 0 00-4 4H4m16 0h-4a4 4 0 00-4 4v1m0-5V4a4 4 0 014-4h4" />
                    </svg>
                    <h3 className="font-bold text-gray-900">Discounts</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Discount */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-gray-700">Student Discount</p>
                                {formData.studentDiscount && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <input
                                            type="number"
                                            value={formData.studentDiscountPercent}
                                            onChange={(e) => updateForm('studentDiscountPercent', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-center"
                                        />
                                        <span className="text-xs text-gray-500">% off</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => updateForm('studentDiscount', !formData.studentDiscount)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${formData.studentDiscount ? 'bg-black' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.studentDiscount ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Group Discount */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-gray-700">Group Discount</p>
                                <p className="text-xs text-gray-400">Limit number of tickets per registrant</p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateForm('groupDiscount', !formData.groupDiscount)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${formData.groupDiscount ? 'bg-black' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.groupDiscount ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <button className="mt-4 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                    Create Promo Codes
                </button>
            </div>

            {/* Registration Form Builder */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="font-bold text-gray-900">Registration Form Builder</h3>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-400 mb-4">Standard Fields (Locked)</p>

                    {/* Locked Fields */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-sm text-gray-600">Full Name</span>
                            </div>
                            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded">REQUIRED</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-600">Email Address</span>
                            </div>
                            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded">REQUIRED</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-4">Custom Fields</p>

                    {/* Custom Fields */}
                    <div className="space-y-3 mb-4">
                        {formData.customFields.map((field) => (
                            <div key={field.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">📝</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{field.label}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {field.type === 'dropdown' ? `Dropdown List • ${field.options?.length} Options` : field.type}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded">REQUIRED</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addCustomField}
                        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-300 transition flex items-center justify-center gap-1"
                    >
                        <span>+</span> Add Custom Field
                    </button>
                </div>
            </div>

            {/* Registration Settings */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="font-bold text-gray-900">Registration Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Requires Approval</p>
                            <p className="text-xs text-gray-400">Review registrations before confirming seats</p>
                        </div>
                        <button
                            onClick={() => updateForm('requiresApproval', !formData.requiresApproval)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${formData.requiresApproval ? 'bg-black' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.requiresApproval ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-700 mb-2">Maximum tickets per person</p>
                        <p className="text-xs text-gray-400 mb-3">Limit number of tickets per registrant</p>
                        <input
                            type="number"
                            value={formData.maxTicketsPerPerson}
                            onChange={(e) => updateForm('maxTicketsPerPerson', parseInt(e.target.value) || 1)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Step 4: Review & Publish ---
    const renderStep4 = () => (
        <div className="space-y-8">
            {/* Event Preview Card */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="h-48 md:h-auto bg-gray-800 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gray-700 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                                <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 md:p-8">
                        <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {formData.eventType || 'Event'}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 mt-3 mb-4">
                            {formData.eventTitle || 'TechVerse Hackathon 2026'}
                        </h2>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formData.startDate || 'Oct 24-28, 2026'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {formData.city || 'San Francisco, CA'} • {formData.venueName || 'Pier 27'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                {formData.ticketTiers[0]?.price
                                    ? `$${formData.ticketTiers[0].price} — ${formData.ticketTiers[0].name}`
                                    : 'Free Entry'
                                }
                            </div>
                        </div>

                        <button className="w-full border border-gray-300 py-2.5 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Preview Landing Page
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Review Details */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Review Details</h3>

                    <div className="space-y-4">
                        {/* Basic Information */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Basic Information</p>
                                        <p className="text-xs text-gray-500 mt-1">Event Category: {formData.category}</p>
                                        <p className="text-xs text-gray-500">Timezone: {formData.timezone.split('(')[0]}</p>
                                    </div>
                                </div>
                                <button onClick={() => goToStep(1)} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
                            </div>
                        </div>

                        {/* Schedule & Agenda */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Schedule & Agenda</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formData.startDate ? `${formData.startDate} - ${formData.endDate || formData.startDate}` : 'Dates not set'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formData.startTime} - {formData.endTime}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => goToStep(2)} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
                            </div>
                        </div>

                        {/* Location & Venue */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Location & Venue</p>
                                        <p className="text-xs text-gray-500 mt-1">{formData.venueName || 'Venue not set'}</p>
                                        <p className="text-xs text-gray-500">{formData.address || ''} {formData.city || ''}</p>
                                    </div>
                                </div>
                                <button onClick={() => goToStep(2)} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
                            </div>
                            {/* Mini Map */}
                            <div className="mt-3 h-24 bg-gray-200 rounded-xl overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                            </div>
                        </div>

                        {/* Registration & Tickets */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Registration & Tickets</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Max capacity: {formData.totalSeats} attendees • {formData.ticketTiers.length} ticket types active
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => goToStep(3)} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Publishing */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Publishing</h3>

                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                        {/* Event Visibility */}
                        <div>
                            <p className="text-sm font-bold text-gray-900 mb-3">Event Visibility</p>
                            <div className="space-y-3">
                                {[
                                    { id: 'public', label: 'Public', desc: 'Listed on our discovery platform' },
                                    { id: 'private', label: 'Private', desc: 'Only accessible via direct link' },
                                    { id: 'invite_only', label: 'Invite Only', desc: 'Requires a specific invite code' },
                                ].map(opt => (
                                    <label key={opt.id} className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={formData.visibility === opt.id}
                                            onChange={() => updateForm('visibility', opt.id)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                                            <p className="text-xs text-gray-400">{opt.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Publish Immediately */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Publish Immediately</p>
                                <p className="text-xs text-gray-400">Go live as soon as you click publish</p>
                            </div>
                            <button
                                onClick={() => updateForm('publishImmediately', !formData.publishImmediately)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${formData.publishImmediately ? 'bg-black' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.publishImmediately ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>

                        {/* Agreements */}
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.confirmRights}
                                    onChange={(e) => updateForm('confirmRights', e.target.checked)}
                                    className="mt-0.5 rounded"
                                />
                                <p className="text-xs text-gray-500">I confirm that I have the rights to use all uploaded images and content for this event.</p>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.agreeToTerms}
                                    onChange={(e) => updateForm('agreeToTerms', e.target.checked)}
                                    className="mt-0.5 rounded"
                                />
                                <p className="text-xs text-gray-500">I agree to the Terms of Service and Event Organizer Agreement.</p>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Progress Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Step {currentStep} of {STEPS.length}</p>
                            <h1 className="text-lg font-bold text-gray-900">{STEPS[currentStep - 1].label}</h1>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center gap-2">
                            {STEPS.map((step, i) => (
                                <div key={step.id} className="flex items-center">
                                    {i > 0 && (
                                        <div className={`w-6 h-0.5 mx-1 ${i < currentStep ? 'bg-black' : 'bg-gray-300'}`} />
                                    )}
                                    <button
                                        onClick={() => goToStep(step.id)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${step.id < currentStep
                                            ? 'bg-black text-white'
                                            : step.id === currentStep
                                                ? 'bg-black text-white'
                                                : 'bg-gray-200 text-gray-400'
                                            }`}
                                    >
                                        {step.id < currentStep ? '✓' : step.id}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{completionPercent}% Complete</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="text-sm text-gray-500 hover:text-gray-700 transition">
                            Save as Draft
                        </button>
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                className="text-sm text-gray-500 hover:text-gray-700 transition"
                            >
                                Back
                            </button>
                        )}
                    </div>

                    {currentStep < 4 ? (
                        <button
                            onClick={nextStep}
                            className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                        >
                            Next: {STEPS[currentStep].label}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => handling_submission_client(formData)}
                            disabled={!formData.agreeToTerms || !formData.confirmRights}
                            className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Publish Event
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Spacer for fixed bottom bar */}
            <div className="h-20" />
        </div>
    );
}