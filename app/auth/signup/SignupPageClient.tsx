'use client';
import React, { useState, useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { buttonClass, fieldClass } from '@/src/lib/ui';
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
                    <div className="mb-3 flex h-12 w-12 items-center justify-center text-ink">
                        {/* Brand mark, not iconography — no lucide equivalent exists. */}
                        <svg aria-hidden="true" width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <path
                                d="M24 4L4 28C4 28 8 32 12 32C16 32 20 28 24 28C28 28 32 32 36 32C40 32 44 28 44 28L24 4Z"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                fill="none"
                                strokeLinejoin="round"
                            />
                            <circle cx="18" cy="18" r="2.5" fill="currentColor" />
                            <circle cx="24" cy="18" r="2.5" fill="currentColor" />
                            <circle cx="30" cy="18" r="2.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h1 className="font-display text-xl text-ink">Avoeline</h1>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-3">
                    <FormFeedback error={error} />

                    <input
                        type="text"
                        name="name"
                        aria-label="Full name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleChange}
                        className={fieldClass}
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        aria-label="Email address"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className={fieldClass}
                        required
                    />
                    <input
                        type="tel"
                        name="contactNo"
                        aria-label="Contact number"
                        placeholder="Contact No"
                        value={formData.contactNo}
                        onChange={handleChange}
                        className={fieldClass}
                        required
                    />
                    <input
                        type="text"
                        name="gender"
                        aria-label="Gender"
                        placeholder="Gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className={fieldClass}
                    />
                    <input
                        type="password"
                        name="password"
                        aria-label="Password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className={fieldClass}
                    />

                    <div className="relative">
                        <select
                            name="country"
                            aria-label="Country"
                            value={formData.country}
                            onChange={handleChange}
                            className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                        >
                            <option value="" disabled>Country</option>
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

                    <div className="relative">
                        <select
                            name="city"
                            aria-label="City"
                            value={formData.city}
                            onChange={handleChange}
                            className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                        >
                            <option value="" disabled>City</option>
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
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-transparent text-ink-soft hover:bg-gray-100'
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

            </div>
        </div>
    );
}
