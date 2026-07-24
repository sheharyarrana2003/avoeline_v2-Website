'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Check, ExternalLink, Info } from 'lucide-react';

interface EmailVerificationStepProps {
  email?: string;
  onNext?: () => void;
  onChangeEmail?: () => void;
}

export default function EmailVerificationStep({
  email = 'ali.ahmed@neduet.edu.pk',
  onNext,
  onChangeEmail,
}: EmailVerificationStepProps) {
  const [timer, setTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [currentStepState, setCurrentStepState] = useState<number>(1);
  const [userEmail, setUserEmail] = useState<string>(email);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = () => {
    if (!canResend) return;
    setTimer(60);
    setCanResend(false);
    showToast('Verification email resent successfully!');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenEmailApp = () => {
    window.open('https://mail.google.com', '_blank');
    if (onNext) {
      setTimeout(() => {
        onNext();
      }, 500);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header Title - Consistent text color */}
      <h2 className="text-xl md:text-2xl font-bold text-gray-700 tracking-wide mb-4 text-center">
        Email Verification
      </h2>

      {/* Main Card - Consistent bg-[#F5F5F5] matching Signin/Signup */}
      <div className="bg-[#F5F5F5] w-full max-w-2xl md:max-w-3xl rounded-[28px] p-8 md:p-12 border border-gray-300/60 shadow-sm flex flex-col items-center text-center font-sans relative">
        {toastMsg && (
          <div className="absolute top-4 bg-black text-white text-xs px-5 py-2.5 rounded-full shadow-lg transition-all animate-bounce z-20">
            {toastMsg}
          </div>
        )}

        {/* Top Mail Badge */}
        <div className="mb-6 relative">
          <div className="bg-[#EAEAEA] rounded-3xl px-9 py-5 flex items-center justify-center relative border border-gray-300/50">
            <svg
              className="w-14 h-11 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Checkmark Circle Badge */}
            <div className="absolute -top-1.5 -right-1.5 bg-black text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-[#F5F5F5]">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Check Your Inbox
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 font-medium mb-3">
          We’ve sent a verification link to
        </p>

        {/* Email Pill Badge */}
        {isEditingEmail ? (
          <div className="flex items-center gap-3 mb-4 w-full max-w-md">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="px-5 py-2 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 text-center w-full focus:outline-none focus:border-black"
              autoFocus
            />
            <button
              onClick={() => setIsEditingEmail(false)}
              className="bg-black text-white text-xs px-4 py-2 rounded-full font-medium shrink-0 hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingEmail(true)}
            className="bg-[#EAEAEA] hover:bg-gray-300/80 text-gray-800 font-semibold px-5 py-2 rounded-full text-sm inline-block mb-3 border border-gray-300 cursor-pointer transition-colors"
            title="Click to edit email"
          >
            {userEmail}
          </div>
        )}

        {/* Description text */}
        <p className="text-xs md:text-sm text-gray-500 leading-relaxed text-center max-w-md mb-8">
          Click the link in the email to securely verify your account and continue setup.
        </p>

        {/* Stepper Progress Indicator */}
        <div className="w-full max-w-lg mb-10 relative">
          {/* Connector Line */}
          <div className="absolute top-[18px] left-[15%] right-[15%] h-[2px] bg-gray-300 -z-0" />
          <div
            className="absolute top-[18px] left-[15%] h-[2px] bg-black transition-all duration-300 -z-0"
            style={{
              width: currentStepState === 1 ? '0%' : currentStepState === 2 ? '35%' : '70%',
            }}
          />

          <div className="flex items-center justify-between relative z-10">
            {/* Step 1: EMAIL SENT */}
            <button
              type="button"
              onClick={() => setCurrentStepState(1)}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentStepState >= 1
                    ? 'bg-black text-white shadow-sm scale-105'
                    : 'bg-[#F5F5F5] border-2 border-gray-400 text-gray-400'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span
                className={`text-[10px] md:text-xs font-bold mt-2.5 uppercase tracking-wider ${
                  currentStepState >= 1 ? 'text-black' : 'text-gray-400'
                }`}
              >
                EMAIL SENT
              </span>
            </button>

            {/* Step 2: LINK CLICKED */}
            <button
              type="button"
              onClick={() => setCurrentStepState(2)}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentStepState >= 2
                    ? 'bg-black text-white shadow-sm scale-105'
                    : 'bg-[#F5F5F5] border-2 border-gray-400 text-gray-400'
                }`}
              >
                {currentStepState >= 2 ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                )}
              </div>
              <span
                className={`text-[10px] md:text-xs font-bold mt-2.5 uppercase tracking-wider ${
                  currentStepState >= 2 ? 'text-black' : 'text-gray-400'
                }`}
              >
                LINK CLICKED
              </span>
            </button>

            {/* Step 3: VERIFIED */}
            <button
              type="button"
              onClick={() => setCurrentStepState(3)}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentStepState >= 3
                    ? 'bg-black text-white shadow-sm scale-105'
                    : 'bg-[#F5F5F5] border-2 border-gray-300 text-gray-400'
                }`}
              >
                {currentStepState >= 3 ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                )}
              </div>
              <span
                className={`text-[10px] md:text-xs font-bold mt-2.5 uppercase tracking-wider ${
                  currentStepState >= 3 ? 'text-black' : 'text-gray-400'
                }`}
              >
                VERIFIED
              </span>
            </button>
          </div>
        </div>

        {/* Buttons Row for Desktop */}
        <div className="w-full max-w-md flex flex-col sm:flex-row gap-4 mb-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className={`flex-1 py-3 px-6 rounded-full border border-gray-400 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              canResend
                ? 'bg-transparent text-black hover:bg-gray-200/60 cursor-pointer'
                : 'bg-transparent text-gray-500 opacity-70 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 11l4-3m-4 3l4 3" />
            </svg>
            Resend Email
          </button>

          <button
            type="button"
            onClick={handleOpenEmailApp}
            className="flex-1 bg-black text-white font-medium py-3.5 px-6 rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
          >
            Open Email App <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Resend countdown timer */}
        <p className="text-xs text-gray-500 mt-2 mb-6">
          {canResend ? 'You can now resend email' : `Resend available in 0:${timer < 10 ? `0${timer}` : timer}`}
        </p>

        {/* Spam Note Box */}
        <div className="bg-[#EAEAEA]/70 border border-gray-300/60 rounded-2xl p-4 flex items-start gap-3 w-full max-w-md text-left mb-6">
          <Info className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            Didn’t receive the email? Check your spam folder or ensure the email address above is correct.
          </p>
        </div>

        {/* Wrong email link */}
        <button
          type="button"
          onClick={() => {
            setIsEditingEmail(true);
            if (onChangeEmail) onChangeEmail();
          }}
          className="text-xs text-gray-500 hover:text-black transition-colors font-normal cursor-pointer"
        >
          Wrong email? Change email address
        </button>
      </div>
    </div>
  );
}
