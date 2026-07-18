'use client';

import { useState } from "react";
import ReactMarkdown from 'react-markdown'

export interface Message {
    id: string;
    role: string;
    content: string;
}


export default function OrganizerChatBotClient({ handleSubmitServer }: any) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, SetInput] = useState("");
    const [loading, SetLoading] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        SetLoading("true");

        // Add user message immediately
        const userMessage = { 
            id: new Date() + Math.random().toString(36).substring(4, length + 2), 
            role: "user", 
            content: input 
        };
        
        setMessages([...messages, userMessage]);
        SetInput("");

        const ai_response = await handleSubmitServer(input);

        // Add AI response
        setMessages(prev => [...prev,
        { id: new Date() + Math.random().toString(36).substring(2, length + 2), role: "ai", content: ai_response }]);
        SetLoading("");
    }

    return (
        <div className="h-screen w-full bg-white text-black flex flex-col font-sans">
            {/* Input Area - fixed at top */}
            <div className="border-b-2 border-black p-4 md:p-6 bg-white shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
                    <input
                        value={input}
                        onChange={(e) => SetInput(e.target.value)}
                        placeholder="Say something..."
                        disabled={!!loading}
                        className="flex-1 px-4 py-3 border-2 border-black bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    />
                    <button 
                        type="submit" 
                        disabled={!!loading || !input.trim()}
                        className="px-6 py-3 bg-black text-white border-2 border-black font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
                    >
                        Send
                    </button>
                </form>
            </div>

            {/* Messages Area - takes all available space */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-400 italic text-lg">
                        Start a conversation...
                    </div>
                )}
                {messages.map((m) => (
                    <div 
                        key={m.id} 
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div 
                            className={`max-w-[85%] md:max-w-[75%] px-4 py-3 border-2 border-black ${
                                m.role === 'user' 
                                    ? 'bg-black text-white' 
                                    : 'bg-white text-black'
                            }`}
                        >
                            <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                                {m.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <div className="prose prose-black max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-gray-100 prose-pre:border prose-pre:border-black prose-code:text-black prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded-none prose-a:text-black prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:pl-4 prose-blockquote:italic">
                                <ReactMarkdown>
                                    {String(m.content)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Loading Indicator - appears after user message */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white text-black border-2 border-black px-4 py-3">
                            <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
                                AI
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}