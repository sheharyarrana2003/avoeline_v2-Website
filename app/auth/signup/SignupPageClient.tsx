
'use client';
import React, { useState, useTransition } from 'react';

export default function SignInClient({handleSubmitLogin} : {handleSubmitLogin:any}) {
    const [isPending, startTransition] = useTransition();
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
        startTransition(async () => {
            await handleSubmitLogin(formData);
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-200">
            {/* Main Card */}
            <div className="bg-gray-100 p-8 sm:p-12 w-full max-w-[440px] flex flex-col items-center">

                {/* Logo Area */}
                <div className="mb-10 flex flex-col items-center">
                    <div className="w-12 h-12 text-black flex items-center justify-center mb-3">
                        {/* Logo matching the image - diamond with three dots */}
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
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Avoeline</h1>
                </div>

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-3 mb-6">
                    <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                        required
                    />
                    <input
                        type="tel"
                        name="contactNo"
                        placeholder="Contact No"
                        value={formData.contactNo}
                        onChange={handleChange}
                        className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                        required
                    />
                    <input
                        type="text"
                        name="gender"
                        placeholder="Gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                    />
                      <input
                        type="password"
                        name="password"
                        placeholder="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm"
                    />

                    {/* Country Dropdown */}
                    <div className="relative">
                        <select
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm appearance-none cursor-pointer"
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
                        <svg aria-hidden="true"
                            className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* City Dropdown */}
                    <div className="relative">
                        <select
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-gray-800 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm appearance-none cursor-pointer"
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
                        <svg aria-hidden="true"
                            className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* Role Selector */}
                    <div className="flex items-center justify-center w-full border border-gray-400 rounded-full overflow-hidden">
                        {['Attendee', 'Organizer', 'Vendor'].map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleSelect(role)}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                                    formData.userType === role
                                        ? 'bg-black text-white'
                                        : 'bg-transparent text-gray-600 hover:bg-gray-200/50'
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
                        className="w-full bg-black text-white font-medium py-3 rounded-full hover:bg-gray-800 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Creating account…' : 'Sign up'}
                    </button>
                </form>

            </div>
        </div>
    );
}