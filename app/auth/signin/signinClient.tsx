'use client';
import React, { useState, useTransition } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaLinkedin } from 'react-icons/fa';

interface LoginResult {
    success: boolean;
    error?: string;
}

interface SignInClientProps {
    handleEmailLogin: (email: string, password: string, next?: string) => Promise<LoginResult>;
}

export default function SignInClient({ handleEmailLogin }: SignInClientProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isPending) return;

        setError(null); // Clear previous errors

        startTransition(async () => {
            // Read ?next= at submit time rather than relying on it being captured
            // when the page rendered — the server re-validates it before using it.
            const next = new URLSearchParams(window.location.search).get('next') ?? '';
            const result = await handleEmailLogin(email, password, next);

            if (!result.success && result.error) {
                setError(result.error);
            }else{
                console.log("status changeddd")
            }
            // If success is true, the server action will redirect (handled by Next.js)
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-200">
            {/* Main Card */}
            <div className="bg-gray-100 p-8 sm:p-12 w-full max-w-[440px] flex flex-col items-center">

                {/* Logo Area */}
                <div className="mb-10 flex flex-col items-center">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-t-full rounded-bl-full rounded-br-md mb-3">
                        {/* Simple logo placeholder to match the diamond/V shape */}
                        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 22h20L12 2z" />
                            <circle cx="12" cy="14" r="2" fill="white" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Avoeline</h1>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="w-full mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <svg aria-hidden="true" 
                            className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">Login failed</p>
                            <p className="text-sm text-red-600 mt-0.5">{error}</p>
                        </div>
                        <button 
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-600 transition"
                        >
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Email & Password Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-4 mb-6">
                    <div className="relative">
                        <input
                            type="email"
                            aria-label="Email address"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`w-full px-6 py-3 border bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                                error 
                                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500' 
                                    : 'border-gray-400 focus:border-black focus:ring-black'
                            }`}
                            required
                        />
                    </div>
                    <div className="relative">
                        <input
                            type="password"
                            aria-label="Password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`w-full px-6 py-3 border bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                                error 
                                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500' 
                                    : 'border-gray-400 focus:border-black focus:ring-black'
                            }`}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        aria-busy={isPending}
                        className="w-full bg-black text-white font-medium py-3 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Signing in…' : 'Sign in with Email'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center w-full mb-6">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-4 text-gray-500 text-sm">or</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Social Login Buttons */}
                <div className="w-full space-y-3">
                    <button
                        type="button"
                        className="w-full flex items-center px-6 py-3 border border-gray-400 bg-transparent rounded-full hover:bg-gray-200/50 transition-colors relative"
                    >
                        <FcGoogle className="text-xl absolute left-6" />
                        <span className="flex-1 text-center text-gray-700 font-medium">Sign in with Google</span>
                    </button>

                    <button
                        type="button"
                        className="w-full flex items-center px-6 py-3 border border-gray-400 bg-transparent rounded-full hover:bg-gray-200/50 transition-colors relative"
                    >
                        <FaApple className="text-xl absolute left-6 text-black" />
                        <span className="flex-1 text-center text-gray-700 font-medium">Sign in with Apple</span>
                    </button>

                    <button
                        type="button"
                        className="w-full flex items-center px-6 py-3 border border-gray-400 bg-transparent rounded-full hover:bg-gray-200/50 transition-colors relative"
                    >
                        <FaLinkedin className="text-xl absolute left-6 text-[#0A66C2]" />
                        <span className="flex-1 text-center text-gray-700 font-medium">Sign in with LinkedIn</span>
                    </button>
                </div>

                {/* Footer Link */}
                <div className="mt-8 text-sm text-gray-600">
                    Don't have an account? <a href="/auth/signup" className="text-black font-semibold hover:underline">Signup</a>
                </div>

            </div>
        </div>
    );
}