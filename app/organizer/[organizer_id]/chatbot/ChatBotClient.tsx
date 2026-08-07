'use client';

import { useState } from "react";
import ReactMarkdown from 'react-markdown'

export interface Message {
    id: string;
    role: string;
    content: string;
}

// --- Icons ---------------------------------------------------------------

function SparkleIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className}>
            <defs>
                <linearGradient id="sparkleGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            <path
                d="M12 2c.6 4.2 2.1 6.9 5.5 8.5-3.4 1.6-4.9 4.3-5.5 8.5-.6-4.2-2.1-6.9-5.5-8.5C9.9 8.9 11.4 6.2 12 2z"
                fill="url(#sparkleGrad)"
            />
        </svg>
    );
}

function SendIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function TrashIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CalendarIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function TicketIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M4 9a2 2 0 002 -2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4V9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M14 7v10" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2" />
        </svg>
    );
}

function ClockIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function QrIcon({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
            <rect x="14.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
            <rect x="3.5" y="14.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
            <path d="M14.5 14.5h2.5v2.5M20.5 14.5v2.5h-2.5M14.5 20.5h2.5M18 20.5h2.5v-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const SUGGESTIONS = [
    {
        text: "Help me plan a product launch for 150 guests",
        icon: CalendarIcon,
    },
    {
        text: "What's the best way to price my event tickets?",
        icon: TicketIcon,
    },
    {
        text: "Create a day-of schedule for my conference",
        icon: ClockIcon,
    },
    {
        text: "How do I set up QR check-in for attendees?",
        icon: QrIcon,
    },
];

export default function OrganizerChatBotClient({ handleSubmitServer }: any) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, SetInput] = useState("");
    const [loading, SetLoading] = useState("");

    // Shared send routine so both the input form and the suggestion
    // cards funnel through the exact same flow as the original handleSubmit.
    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;
        SetLoading("true");

        // Add user message immediately
        const userMessage = {
            id: new Date() + Math.random().toString(36).substring(4, length + 2),
            role: "user",
            content: text
        };

        setMessages(prev => [...prev, userMessage]);
        SetInput("");

        const ai_response = await handleSubmitServer(text);

        // Add AI response
        setMessages(prev => [...prev,
        { id: new Date() + Math.random().toString(36).substring(2, length + 2), role: "ai", content: ai_response }]);
        SetLoading("");
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    }

    return (
        <div className="h-screen w-full bg-gray-100 flex items-center justify-center p-3 md:p-8 font-sans">
            <div className="w-full h-full max-w-5xl mx-auto flex flex-col bg-white border border-black/10 rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="border-b border-black/10 px-5 md:px-8 py-5 shrink-0 flex items-start justify-between">
                    <div>
                        <div className="text-2xl md:text-[28px] font-semibold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Avoeline
                        </div>
                        <div className="text-gray-400 text-sm md:text-base mt-0.5">
                            Your AI event planning assistant
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Online
                        </div>
                        <SparkleIcon className="w-7 h-7 md:w-8 md:h-8" />
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6">
                    <div className="w-full space-y-6">
                        {messages.length === 0 && (
                            <div className="min-h-[45vh] flex flex-col items-center justify-center gap-8">
                                <div className="text-center text-gray-400 text-sm max-w-sm">
                                    Ask me anything about planning, marketing, or running your event.
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                                    {SUGGESTIONS.map((s, i) => {
                                        const Icon = s.icon;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => sendMessage(s.text)}
                                                className="relative text-left bg-black/[0.04] hover:bg-black/[0.08] border border-black/10 rounded-2xl p-4 pr-12 transition-colors group"
                                            >
                                                <span className="text-[13.5px] leading-snug text-gray-800">
                                                    {s.text}
                                                </span>
                                                <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/10 group-hover:bg-black/15 flex items-center justify-center text-gray-700 transition-colors">
                                                    <Icon className="w-4 h-4" />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {m.role === 'user' ? (
                                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-black/10 text-gray-900 text-[15px] leading-relaxed">
                                        <ReactMarkdown>
                                            {String(m.content)}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="max-w-[85%] flex gap-3 items-start border border-black/10 bg-black/[0.03] rounded-2xl px-4 py-3">
                                        <div className="w-7 h-7 rounded-full bg-black/5 border border-black/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <SparkleIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="text-[15px] leading-relaxed text-gray-800 prose  prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-headings:font-medium prose-headings:text-gray-900 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-gray-900 prose-pre:bg-gray-100 prose-pre:border prose-pre:border-black/10 prose-pre:rounded-lg prose-code:text-purple-600 prose-code:bg-black/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-purple-600 prose-a:underline prose-a:underline-offset-2 prose-blockquote:border-l-2 prose-blockquote:border-black/20 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-gray-500">
                                            <ReactMarkdown>
                                                {String(m.content)}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading Indicator */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 rounded-full bg-black/5 border border-black/10 flex items-center justify-center shrink-0 mr-3">
                                    <SparkleIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex items-center gap-1.5 py-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-5 md:px-8 pb-5 pt-2 shrink-0">
                    <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 border border-black/10 bg-black/5 rounded-full px-4 py-2 focus-within:border-black/25 transition-colors">
                            <input
                                value={input}
                                onChange={(e) => SetInput(e.target.value)}
                                placeholder="Enter a prompt here"
                                disabled={!!loading}
                                className="flex-1 py-1.5 bg-transparent text-gray-900 placeholder-gray-400 text-[15px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={!!loading || !input.trim()}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:bg-black/10 disabled:text-gray-400 disabled:cursor-not-allowed shrink-0"
                            >
                                <SendIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setMessages([]); SetInput(""); }}
                            title="Clear conversation"
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 border border-black/10 text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-colors shrink-0"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="text-[11px] text-gray-400 text-center mt-3">
                        Avoeline may display inaccurate info, so double-check its responses.
                    </div>
                </div>
            </div>
        </div>
    );
}