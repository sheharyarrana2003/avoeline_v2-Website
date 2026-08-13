'use client';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { buttonClass, fieldClass } from '@/src/lib/ui';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';

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
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-t-full rounded-bl-full rounded-br-md bg-ink text-ink-invert">
                        {/* Brand mark, not iconography — no lucide equivalent exists. */}
                        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 22h20L12 2z" />
                            <circle cx="12" cy="14" r="2" fill="white" />
                        </svg>
                    </div>
                    <h1 className="font-display text-xl text-ink">Avoeline</h1>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <FormFeedback error={error} />

                    <input
                        type="email"
                        aria-label="Email address"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError(null);
                        }}
                        className={fieldClass}
                        required
                    />
                    <input
                        type="password"
                        aria-label="Password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError(null);
                        }}
                        className={fieldClass}
                        required
                    />
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
