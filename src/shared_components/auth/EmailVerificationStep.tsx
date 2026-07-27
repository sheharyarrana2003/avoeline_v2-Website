'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, ExternalLink, Info, Loader2 } from 'lucide-react';

type StatusResult = { verified: boolean; email?: string };
type ResendResult = { success: boolean; alreadyVerified?: boolean; error?: string };
interface EmailVerificationStepProps {
  email?: string;
  /** True when Firebase already reports the address verified (server-rendered). */
  initialVerified?: boolean;
  /** Re-reads verification state from Firebase Auth. */
  onCheckStatus?: () => Promise<StatusResult>;
  /** Re-sends Firebase's verification email. */
  onResend?: () => Promise<ResendResult>;
  onNext?: () => void;
}

const RESEND_COOLDOWN = 60;

export default function EmailVerificationStep({
  email = '',
  initialVerified = false,
  onCheckStatus,
  onResend,
  onNext,
}: EmailVerificationStepProps) {
  const [verified, setVerified] = useState<boolean>(initialVerified);
  const [address, setAddress] = useState<string>(email);
  const [timer, setTimer] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canResend = timer === 0 && !isResending && !verified;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Resend cooldown.
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const check = useCallback(
    async (announce: boolean) => {
      if (!onCheckStatus) return;
      setIsChecking(true);
      try {
        const res = await onCheckStatus();
        // The address can change under us (see the change-email flow), and Auth
        // is authoritative for it.
        if (res?.email) setAddress(res.email);
        if (res?.verified) {
          setVerified(true);
          if (announce) showToast('Email verified!');
        } else if (announce) {
          showToast('Not verified yet — click the link in the email first.');
        }
      } catch {
        if (announce) setError('Could not check verification status.');
      } finally {
        setIsChecking(false);
      }
    },
    [onCheckStatus]
  );

  // The link is clicked in another tab or on a phone, so nothing tells this page
  // about it — poll while unverified, and re-check whenever the tab regains focus.
  useEffect(() => {
    if (verified || !onCheckStatus) return;
    const id = setInterval(() => check(false), 5000);
    const onFocus = () => check(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [verified, onCheckStatus, check]);

  const handleResend = async () => {
    if (!canResend || !onResend) return;
    setError(null);
    setIsResending(true);
    try {
      const res = await onResend();
      if (res?.alreadyVerified) {
        setVerified(true);
        showToast('This address is already verified.');
      } else if (res?.success) {
        setTimer(RESEND_COOLDOWN);
        showToast('Verification email sent.');
      } else {
        setError(res?.error || 'Could not send the email. Try again shortly.');
      }
    } catch {
      setError('Could not send the email. Try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  // Real progress: sent → link clicked (Firebase says verified) → done.
  const stepState = verified ? 3 : 1;

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl md:text-2xl font-bold text-gray-700 tracking-wide mb-4 text-center">
        Email Verification
      </h2>

      <div className="bg-[#F5F5F5] w-full max-w-2xl md:max-w-3xl rounded-[28px] p-8 md:p-12 border border-gray-300/60 shadow-sm flex flex-col items-center text-center font-sans relative">
        {toastMsg && (
          <div className="absolute top-4 bg-black text-white text-xs px-5 py-2.5 rounded-full shadow-lg z-20">
            {toastMsg}
          </div>
        )}

        {/* Top Mail Badge */}
        <div className="mb-6 relative">
          <div className="bg-[#EAEAEA] rounded-3xl px-9 py-5 flex items-center justify-center relative border border-gray-300/50">
            <svg className="w-14 h-11 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {verified && (
              <div className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-[#F5F5F5]">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-2">
          {verified ? 'Email Verified' : 'Check Your Inbox'}
        </h1>

        <p className="text-sm text-gray-500 font-medium mb-3">
          {verified ? 'Verified address' : 'We’ve sent a verification link to'}
        </p>

        <div className="bg-[#EAEAEA] text-gray-800 font-semibold px-5 py-2 rounded-full text-sm inline-block mb-3 border border-gray-300">
          {address || '—'}
        </div>

        {/* Live status pill */}
        <div className="mb-6">
          {verified ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
              {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-amber-500" />}
              Awaiting verification
            </span>
          )}
        </div>

        <p className="text-xs md:text-sm text-gray-500 leading-relaxed text-center max-w-md mb-8">
          {verified
            ? 'Your email address is confirmed. You can continue with setup.'
            : 'Click the link in the email to verify your account. This page updates on its own once you do — you can also continue setup and verify later.'}
        </p>

        {/* Progress — reflects real state, not clickable */}
        <div className="w-full max-w-lg mb-10 relative">
          <div className="absolute top-[18px] left-[15%] right-[15%] h-[2px] bg-gray-300 -z-0" />
          <div
            className="absolute top-[18px] left-[15%] h-[2px] bg-black transition-all duration-300 -z-0"
            style={{ width: verified ? '70%' : '0%' }}
          />
          <div className="flex items-center justify-between relative z-10">
            {[
              { id: 1, label: 'EMAIL SENT' },
              { id: 2, label: 'LINK CLICKED' },
              { id: 3, label: 'VERIFIED' },
            ].map((s) => {
              const reached = stepState >= s.id;
              return (
                <div key={s.id} className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      reached ? 'bg-black text-white shadow-sm scale-105' : 'bg-[#F5F5F5] border-2 border-gray-400 text-gray-400'
                    }`}
                  >
                    {reached ? <Check className="w-4 h-4 stroke-[3]" /> : <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />}
                  </div>
                  <span className={`text-[10px] md:text-xs font-bold mt-2.5 uppercase tracking-wider ${reached ? 'text-black' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-4 py-2">{error}</p>
        )}

        {!verified && (
          <>
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
                {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {isResending ? 'Sending…' : 'Resend Email'}
              </button>

              <button
                type="button"
                onClick={() => check(true)}
                disabled={isChecking}
                className="flex-1 bg-black text-white font-medium py-3.5 px-6 rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isChecking ? 'Checking…' : "I've verified"} <Check className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2 mb-6">
              {timer > 0 ? `Resend available in 0:${timer < 10 ? `0${timer}` : timer}` : 'You can resend the email'}
            </p>
          </>
        )}

        {verified && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="bg-black text-white font-medium py-3.5 px-10 rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer mb-6"
          >
            Continue <ExternalLink className="w-4 h-4" />
          </button>
        )}

        {!verified && (
          <div className="bg-[#EAEAEA]/70 border border-gray-300/60 rounded-2xl p-4 flex items-start gap-3 w-full max-w-md text-left">
            <Info className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Didn’t receive the email? Check your spam folder. Verification isn’t required to finish
              setup — you can carry on and verify from this page later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
