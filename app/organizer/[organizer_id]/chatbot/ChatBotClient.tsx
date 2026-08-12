'use client';

import { useState } from "react";
import ReactMarkdown from 'react-markdown'
import { ArrowUp, CalendarDays, Clock, QrCode, Sparkles, Ticket, Trash2 } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { buttonClass } from "@/src/lib/ui";

export interface Message {
    id: string;
    role: string;
    content: string;
}

const SUGGESTIONS = [
    { text: "Help me plan a product launch for 150 guests", Icon: CalendarDays },
    { text: "What's the best way to price my event tickets?", Icon: Ticket },
    { text: "Create a day-of schedule for my conference", Icon: Clock },
    { text: "How do I set up QR check-in for attendees?", Icon: QrCode },
];

// The typography plugin is installed but never registered with @plugin in
// globals.css, so every prose-* class compiled to nothing. These do the same job
// and actually render.
const MARKDOWN =
    "text-sm leading-relaxed text-ink [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

export default function OrganizerChatBotClient({ handleSubmitServer }: any) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, SetInput] = useState("");
    const [loading, SetLoading] = useState(false);

    // Shared send routine so both the input form and the suggestion
    // cards funnel through the exact same flow as the original handleSubmit.
    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;
        SetLoading(true);

        // Add user message immediately
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);
        SetInput("");

        const ai_response = await handleSubmitServer(text);

        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "ai", content: ai_response }]);
        SetLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    }

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <PageHeader title="Avoeline AI" description="Your AI event planning assistant" />

                <div className="flex h-[70vh] flex-col rounded-2xl border border-line bg-paper">

                    {/* Messages Area */}
                    <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 md:px-8">
                        {messages.length === 0 && (
                            <div className="flex min-h-full flex-col items-center justify-center gap-8">
                                <p className="max-w-sm text-center text-sm text-ink-soft">
                                    Ask me anything about planning, marketing, or running your event.
                                </p>

                                <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                                    {SUGGESTIONS.map(({ text, Icon }) => (
                                        <button
                                            key={text}
                                            type="button"
                                            onClick={() => sendMessage(text)}
                                            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-canvas p-4 text-left text-sm text-ink transition hover:border-line-loud"
                                        >
                                            {text}
                                            <Icon size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {m.role === 'user' ? (
                                    <div className={`max-w-[80%] rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2.5 ${MARKDOWN}`}>
                                        <ReactMarkdown>{String(m.content)}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex max-w-[85%] items-start gap-3 rounded-2xl border border-line bg-canvas px-4 py-3">
                                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-paper">
                                            <Sparkles size={14} className="text-ink-soft" aria-hidden="true" />
                                        </span>
                                        <div className={MARKDOWN}>
                                            <ReactMarkdown>{String(m.content)}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-center gap-3" aria-live="polite">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-paper">
                                    <Sparkles size={14} className="text-ink-soft" aria-hidden="true" />
                                </span>
                                <span className="text-sm text-ink-soft">Thinking…</span>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-line px-5 pb-5 pt-4 md:px-8">
                        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
                            <div className="flex flex-1 items-center gap-2 rounded-full border border-line-loud bg-paper px-4 py-1.5 focus-within:border-gray-900">
                                <input
                                    value={input}
                                    onChange={(e) => SetInput(e.target.value)}
                                    placeholder="Enter a prompt here"
                                    aria-label="Message Avoeline AI"
                                    disabled={loading}
                                    className="flex-1 bg-transparent py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    aria-label="Send message"
                                    className={buttonClass("primary", "sm", "shrink-0 rounded-full")}
                                >
                                    <ArrowUp size={16} aria-hidden="true" />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setMessages([]); SetInput(""); }}
                                aria-label="Clear conversation"
                                className={buttonClass("secondary", "md", "shrink-0 rounded-full")}
                            >
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        </form>
                        <p className="mt-3 text-center text-2xs text-ink-soft">
                            Avoeline may display inaccurate info, so double-check its responses.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
