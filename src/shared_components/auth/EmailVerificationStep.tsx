'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Check, Info, Loader2, Mail, Send } from 'lucide-react';
import { buttonClass } from '@/src/lib/ui';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';

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
    <div className="flex w-full flex-col items-center">
      <div className="relative flex w-full max-w-2xl flex-col items-center rounded-2xl border border-line bg-paper p-8 text-center md:max-w-3xl md:p-12">
        {toastMsg && (
          <div
            role="status"
            className="absolute top-4 z-20 rounded-full bg-gray-900 px-5 py-2.5 text-xs font-medium text-white"
          >
            {toastMsg}
          </div>
        )}

        <div className="relative mb-6">
          <div className="flex items-center justify-center rounded-2xl border border-line bg-canvas px-9 py-5">
            <Mail className="h-11 w-11 text-ink-soft" aria-hidden="true" />
            {verified && (
              <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-paper bg-gray-900 text-white">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        <h1 className="mb-2 font-display text-2xl text-ink md:text-3xl">
          {verified ? 'Email Verified' : 'Check Your Inbox'}
        </h1>

        <p className="mb-3 text-sm text-ink-soft">
          {verified ? 'Verified address' : 'We’ve sent a verification link to'}
        </p>

        <div className="mb-3 inline-block rounded-full border border-line bg-canvas px-5 py-2 text-sm font-semibold text-ink">
          {address || '—'}
        </div>

        <div className="mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-loud px-4 py-1.5 text-xs font-bold uppercase text-ink">
            {verified ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : isChecking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gray-900" />
            )}
            {verified ? 'Verified' : 'Awaiting verification'}
          </span>
        </div>

        <p className="mb-8 max-w-md text-sm leading-relaxed text-ink-soft">
          {verified
            ? 'Your email address is confirmed. You can continue with setup.'
            : 'Click the link in the email to verify your account. This page updates on its own once you do — you can also continue setup and verify later.'}
        </p>

        {/* Progress — reflects real state, not clickable */}
        <div className="relative mb-10 w-full max-w-lg">
          <div aria-hidden="true" className="absolute left-[15%] right-[15%] top-[18px] h-0.5 bg-line" />
          <div
            aria-hidden="true"
            className="absolute left-[15%] top-[18px] h-0.5 bg-gray-900 transition-all duration-300"
            style={{ width: verified ? '70%' : '0%' }}
          />
          <ol className="relative z-10 flex items-center justify-between">
            {[
              { id: 1, label: 'EMAIL SENT' },
              { id: 2, label: 'LINK CLICKED' },
              { id: 3, label: 'VERIFIED' },
            ].map((s) => {
              const reached = stepState >= s.id;
              return (
                <li key={s.id} className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                      reached ? 'bg-gray-900 text-white' : 'border border-line-loud bg-paper text-ink-soft'
                    }`}
                  >
                    {reached ? <Check className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full bg-line-loud" />}
                  </span>
                  <span
                    className={`mt-2.5 text-2xs font-bold uppercase ${reached ? 'text-ink' : 'text-ink-soft'}`}
                  >
                    {s.label}
                    <span className="sr-only">{reached ? ' — done' : ' — pending'}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <FormFeedback error={error} className="mb-4 w-full max-w-md" />

        {!verified && (
          <>
            <div className="mb-2 flex w-full max-w-md flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className={buttonClass('secondary', 'lg', 'flex-1')}
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {isResending ? 'Sending…' : 'Resend Email'}
              </button>

              <button
                type="button"
                onClick={() => check(true)}
                disabled={isChecking}
                className={buttonClass('primary', 'lg', 'flex-1')}
              >
                {isChecking ? 'Checking…' : "I've verified"}
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mb-6 mt-2 text-xs text-ink-soft tabular-nums">
              {timer > 0 ? `Resend available in 0:${timer < 10 ? `0${timer}` : timer}` : 'You can resend the email'}
            </p>
          </>
        )}

        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className={buttonClass(verified ? 'primary' : 'ghost', 'lg', 'mb-6')}
          >
            {verified ? 'Continue' : 'Continue without verifying'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {!verified && (
          <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-left">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-ink-soft">
              Didn’t receive the email? Check your spam folder. Verification isn’t required to finish
              setup — you can carry on and verify from this page later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
