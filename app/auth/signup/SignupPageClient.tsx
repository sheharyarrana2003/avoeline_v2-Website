'use client';
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { buttonClass, fieldClass, labelClass } from '@/src/lib/ui';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';

type SignupResult = { success: boolean; error?: string } | void;

export default function SignInClient({ handleSubmitLogin }: { handleSubmitLogin: (formData: unknown) => Promise<SignupResult> }) {
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
        userType: 'Organizer',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleSelect = (userType: string) => {
        setFormData({ ...formData, userType });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isPending) return; // guard against duplicate submissions
        setError(null);
        startTransition(async () => {
            // The action returns { success:false, error } instead of throwing. This
            // result used to be dropped on the floor, so a rejected signup — a taken
            // email, a weak password — rendered nothing at all and looked like a
            // dead button.
            const res = await handleSubmitLogin(formData);
            if (res && !res.success) {
                setError(res.error ?? 'Failed to setup an account. Please try again.');
            }
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
            <div className="flex w-full max-w-[440px] flex-col items-center rounded-2xl border border-line bg-paper p-8 sm:p-12">

                <div className="mb-10 flex flex-col items-center">
                    <BrandMark className="mb-3 h-12 w-12" />
                    <h1 className="font-display text-xl text-ink">Avoeline</h1>
                    <p className="mt-1 text-sm text-ink-soft">Create your account</p>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-3">
                    <FormFeedback error={error} />

                    {/* Visible labels, where these were placeholder-only with an
                        aria-label. A placeholder vanishes the moment you type, so a
                        sighted user filling a five-field form loses every field name
                        exactly when they want to re-check one. autoComplete was
                        missing too, so browsers could not fill any of it. */}
                    <div>
                        <label htmlFor="signup-name" className={labelClass}>Full name</label>
                        <input
                            id="signup-name"
                            type="text"
                            name="name"
                            autoComplete="name"
                            placeholder="Ayesha Khan"
                            value={formData.name}
                            onChange={handleChange}
                            className={`${fieldClass} mt-1.5`}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="signup-email" className={labelClass}>Email address</label>
                        <input
                            id="signup-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            className={`${fieldClass} mt-1.5`}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="signup-contact" className={labelClass}>Contact number</label>
                        <input
                            id="signup-contact"
                            type="tel"
                            name="contactNo"
                            autoComplete="tel"
                            placeholder="+92 300 0000000"
                            value={formData.contactNo}
                            onChange={handleChange}
                            className={`${fieldClass} mt-1.5`}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="signup-gender" className={labelClass}>Gender (optional)</label>
                        <input
                            id="signup-gender"
                            type="text"
                            name="gender"
                            placeholder="Prefer not to say"
                            value={formData.gender}
                            onChange={handleChange}
                            className={`${fieldClass} mt-1.5`}
                        />
                    </div>
                    <div>
                        <label htmlFor="signup-password" className={labelClass}>Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            placeholder="At least 6 characters"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className={`${fieldClass} mt-1.5`}
                        />
                    </div>

                    {/* Labelled like the inputs above. These two were the only fields
                        left carrying an aria-label and a disabled first option in place
                        of a real label, which read as inconsistent once the rest gained
                        one — and the placeholder-option trick disappears on selection
                        exactly the way a placeholder does. */}
                    <div>
                      <label htmlFor="signup-country" className={labelClass}>Country</label>
                      <div className="relative mt-1.5">
                        <select
                            id="signup-country"
                            name="country"
                            autoComplete="country-name"
                            value={formData.country}
                            onChange={handleChange}
                            className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                        >
                            <option value="" disabled>Select a country</option>
                            <option value="usa">United States</option>
                            <option value="uk">United Kingdom</option>
                            <option value="canada">Canada</option>
                            <option value="australia">Australia</option>
                            <option value="germany">Germany</option>
                            <option value="france">France</option>
                            <option value="india">India</option>
                            <option value="japan">Japan</option>
                        </select>
                        <ChevronDown
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-ink-soft"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-city" className={labelClass}>City</label>
                      <div className="relative mt-1.5">
                        <select
                            id="signup-city"
                            name="city"
                            autoComplete="address-level2"
                            value={formData.city}
                            onChange={handleChange}
                            className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                        >
                            <option value="" disabled>Select a city</option>
                            <option value="new-york">New York</option>
                            <option value="london">London</option>
                            <option value="toronto">Toronto</option>
                            <option value="sydney">Sydney</option>
                            <option value="berlin">Berlin</option>
                            <option value="paris">Paris</option>
                            <option value="mumbai">Mumbai</option>
                            <option value="tokyo">Tokyo</option>
                        </select>
                        <ChevronDown
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-ink-soft"
                        />
                      </div>
                    </div>

                    {/* Segmented control, so aria-pressed carries the selection for anyone
                        who cannot see the inverted fill. */}
                    <div className="flex w-full items-center overflow-hidden rounded-lg border border-line-loud" role="group" aria-label="Account type">
                        {['Attendee', 'Organizer', 'Vendor'].map((role) => (
                            <button
                                key={role}
                                type="button"
                                aria-pressed={formData.userType === role}
                                onClick={() => handleRoleSelect(role)}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${formData.userType === role
                                    ? 'bg-ink text-ink-invert'
                                    : 'bg-transparent text-ink-soft hover:bg-muted'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        aria-busy={isPending}
                        className={buttonClass('primary', 'lg', 'mt-2 w-full')}
                    >
                        {isPending ? 'Creating account…' : 'Sign up'}
                    </button>
                </form>

                {/* Sign-in offers a route to sign-up and sign-up offered nothing back,
                    so anyone who already had an account and landed here had to edit the
                    URL. The pair has to be reciprocal. */}
                <div className="mt-8 text-sm text-ink-soft">
                    Already have an account?{' '}
                    <Link href="/auth/signin" className="font-semibold text-ink hover:underline">
                        Sign in
                    </Link>
                </div>

            </div>
        </div>
    );
}
