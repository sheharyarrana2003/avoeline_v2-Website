'use client';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { buttonClass, fieldClass, labelClass } from '@/src/lib/ui';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';
import { BrandMark } from '@/src/shared_components/ui/BrandMark';

interface LoginResult {
    success: boolean;
    error?: string;
}

interface SignInClientProps {
    /** Resolves to undefined on success — the action redirects instead of returning. */
    handleEmailLogin: (email: string, password: string, next?: string) => Promise<LoginResult | void>;
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

            // On success the action redirects and never resolves to a value.
            if (result && !result.success) {
                setError(result.error ?? 'Failed to login. Please try again.');
            }
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
            <div className="flex w-full max-w-[440px] flex-col items-center rounded-2xl border border-line bg-paper p-8 sm:p-12">

                <div className="mb-10 flex flex-col items-center">
                    {/* BrandMark, not a local SVG. This file drew its own triangle-and-circle
                        glyph, which is not the Avoeline mark — the whole point of BrandMark
                        is that the mark has one definition. */}
                    <BrandMark className="mb-3 h-12 w-12" />
                    <h1 className="font-display text-xl text-ink">Avoeline</h1>
                    <p className="mt-1 text-sm text-ink-soft">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <FormFeedback error={error} />

                    {/* Visible labels, where these were placeholder-only. A placeholder
                        disappears the moment you type into the field, so the only thing
                        naming the input is gone exactly when you want to check it. */}
                    <div>
                        <label htmlFor="signin-email" className={labelClass}>
                            Email address
                        </label>
                        <input
                            id="signin-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`${fieldClass} mt-1.5`}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="signin-password" className={labelClass}>
                            Password
                        </label>
                        <input
                            id="signin-password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError(null);
                            }}
                            className={`${fieldClass} mt-1.5`}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        aria-busy={isPending}
                        className={buttonClass('primary', 'lg', 'w-full')}
                    >
                        {isPending ? 'Signing in…' : 'Sign in with Email'}
                    </button>
                </form>

                {/* The Google / Apple / LinkedIn buttons that stood here had no onClick and
                    no provider wired behind them — three controls that did nothing when
                    pressed. Deleted rather than disabled: an offer to sign in a way the
                    product cannot is worse than not offering it. */}

                <div className="mt-8 text-sm text-ink-soft">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="font-semibold text-ink hover:underline">
                        Sign up
                    </Link>
                </div>

            </div>
        </div>
    );
}
