'use client';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';
import { AuthShell } from '@/src/shared_components/auth/AuthShell';
import { PasswordField } from '@/src/shared_components/ui/PasswordField';
import { Button, Input, Select } from '@/components/ui';

type SignupResult = { success: boolean; error?: string } | void;

const ROLES = ['Attendee', 'Organizer', 'Vendor'] as const;

function initialRole(role?: string) {
    const match = ROLES.find((r) => r.toLowerCase() === String(role ?? '').toLowerCase());
    return match ?? 'Organizer';
}

export default function SignInClient({
    handleSubmitLogin,
    role,
}: {
    handleSubmitLogin: (formData: unknown) => Promise<SignupResult>;
    role?: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contactNo: '',
        gender: '',
        country: '',
        city: '',
        password: '',
        userType: initialRole(role),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleSelect = (userType: (typeof ROLES)[number]) => {
        setFormData({ ...formData, userType });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isPending) return;
        setError(null);
        startTransition(async () => {
            const res = await handleSubmitLogin(formData);
            if (res && !res.success) {
                setError(res.error ?? 'Failed to setup an account. Please try again.');
            }
        });
    };

    return (
        <AuthShell
            eyebrow="Create an account"
            headline="One platform. The role you actually need."
            copy="Organizers run the event. Vendors bid on the work. Attendees find what is open."
        >
            <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Sign up</h1>
                <p className="text-sm text-ink-soft">Takes a minute. Setup comes next.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <FormFeedback error={error} />

                <Input
                    id="signup-name"
                    label="Full name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Ayesha Khan"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />

                <Input
                    id="signup-email"
                    label="Email address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <Input
                    id="signup-contact"
                    label="Contact number"
                    type="tel"
                    name="contactNo"
                    autoComplete="tel"
                    placeholder="+92 300 0000000"
                    value={formData.contactNo}
                    onChange={handleChange}
                    required
                />

                <Input
                    id="signup-gender"
                    label="Gender (optional)"
                    type="text"
                    name="gender"
                    placeholder="Prefer not to say"
                    value={formData.gender}
                    onChange={handleChange}
                />

                <PasswordField
                    id="signup-password"
                    name="password"
                    label="Password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(password) => setFormData({ ...formData, password })}
                    required
                />

                <Select
                    id="signup-country"
                    name="country"
                    label="Country"
                    autoComplete="country-name"
                    value={formData.country}
                    onChange={handleChange}
                >
                    <option value="" disabled>Select a country</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="India">India</option>
                    <option value="Japan">Japan</option>
                    <option value="Other">Other</option>
                </Select>

                <Input
                    id="signup-city"
                    name="city"
                    label="City"
                    type="text"
                    autoComplete="address-level2"
                    maxLength={80}
                    placeholder="Lahore"
                    value={formData.city}
                    onChange={handleChange}
                />

                <div>
                    <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-ink-soft">
                        Account type
                    </span>
                    <div className="flex w-full items-center overflow-hidden rounded-lg border border-line-loud bg-muted/30 p-1" role="group" aria-label="Account type">
                        {ROLES.map((roleOption) => (
                            <button
                                key={roleOption}
                                type="button"
                                aria-pressed={formData.userType === roleOption}
                                onClick={() => handleRoleSelect(roleOption)}
                                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-150 ${
                                    formData.userType === roleOption
                                        ? 'bg-paper text-ink shadow-xs font-semibold'
                                        : 'text-ink-soft hover:text-ink'
                                }`}
                            >
                                {roleOption}
                            </button>
                        ))}
                    </div>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isPending}
                    className="mt-4"
                >
                    Sign up
                </Button>
            </form>

            <p className="mt-8 text-center sm:text-left text-sm text-ink-soft">
                Already have an account?{' '}
                <Link href="/auth/signin" className="font-semibold text-primary underline-offset-4 hover:underline">
                    Sign in
                </Link>
            </p>
        </AuthShell>
    );
}
