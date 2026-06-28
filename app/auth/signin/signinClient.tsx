'use client';
import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaLinkedin } from 'react-icons/fa';

export default function SignInClient({handleEmailLogin}:{handleEmailLogin:any}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Call the server action safely with just data strings
    await handleEmailLogin(email, password);
  };


    return (
        <div className="min-h-screen flex items-center justify-center bg-[#E5E5E5]">
            {/* Main Card */}
            <div className="bg-[#F5F5F5] p-8 sm:p-12 w-full max-w-[440px] flex flex-col items-center">

                {/* Logo Area */}
                <div className="mb-10 flex flex-col items-center">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-t-full rounded-bl-full rounded-br-md mb-3">
                        {/* Simple logo placeholder to match the diamond/V shape */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 22h20L12 2z" />
                            <circle cx="12" cy="14" r="2" fill="white" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Avoeline</h1>
                </div>

                {/* Email & Password Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-4 mb-6">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-6 py-3 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-6 py-3 border border-gray-400 bg-transparent rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-black text-white font-medium py-3 rounded-full hover:bg-gray-800 transition-colors"
                    >
                        Sign in with Email
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
                    Don't have an account? <a href="/signup" className="text-black font-semibold hover:underline">Signup</a>
                </div>

            </div>
        </div>
    );
}