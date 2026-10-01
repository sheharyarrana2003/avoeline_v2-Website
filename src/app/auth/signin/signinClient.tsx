'use client';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';
import { AuthShell } from '@/src/shared_components/auth/AuthShell';
import { PasswordField } from '@/src/shared_components/ui/PasswordField';
import { Button, Input } from '@/components/ui';

interface LoginResult {
    success: boolean;
    error?: string;
}

interface SignInClientProps {
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

        setError(null);

        startTransition(async () => {
            const next = new URLSearchParams(window.location.search).get('next') ?? '';
            const result = await handleEmailLogin(email, password, next);

            if (result && !result.success) {
                setError(result.error ?? 'Failed to login. Please try again.');
            }
        });
    };

    return (
        <AuthShell
            eyebrow="Welcome back"
            headline="Pick up where the event left off."
            copy="Quotes, bookings, and analytics — one sign-in, whichever role you hold."
        >
            <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Sign in</h1>
                <p className="text-sm text-ink-soft">Use the email on your Avoeline account.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <FormFeedback error={error} />

                <Input
                    id="signin-email"
                    type="email"
                    label="Email address"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                    }}
                    required
                />

                <PasswordField
                    id="signin-password"
                    label="Password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(value) => {
                        setPassword(value);
                        if (error) setError(null);
                    }}
                    required
                />

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isPending}
                    className="mt-2"
                >
                    Sign in
                </Button>
            </form>

            <p className="mt-8 text-center sm:text-left text-sm text-ink-soft">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
                    Sign up
                </Link>
            </p>
        </AuthShell>
    );
}
