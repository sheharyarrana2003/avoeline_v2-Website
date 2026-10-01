import { AuthService, VendorSetupProfileData } from '@/src/features/auth/authService';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import VendorSetupClient from './VendorSetupClient';

export default async function SignUpVendorPage() {
  const user = await AuthService.getCurrentUser();
  // Signed out (or an expired session) belongs at sign-in, not at the signup form
  // — the account already exists by the time anyone reaches setup.
  if (!user) {
    redirect('/auth/signin?next=/auth/signup/vendorSetup');
  }
  const userType = String(user.userType).toLowerCase();
  if (userType !== 'vendor') {
    // Signed in as someone else: send them to their own setup rather than a
    // signup form they don't need.
    redirect(userType === 'organizer' ? '/auth/signup/organizerSetup' : '/auth/signin');
  }

  // Verification state is read live from Supabase Auth — the emailed link is
  // clicked outside the app, so nothing else tells us it happened.
  const { verified: initialVerified } = await AuthService.getEmailVerificationStatus();

  const handleCheckVerification = async () => {
    'use server';
    try {
      return await AuthService.getEmailVerificationStatus();
    } catch (error) {
      console.error('[vendorSetup] verification check failed', error);
      return { verified: false };
    }
  };

  const handleResendVerification = async () => {
    'use server';
    try {
      return await AuthService.resendVerificationEmail();
    } catch (error) {
      console.error('[vendorSetup] resend verification failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send the email.',
      };
    }
  };

  const handleSaveProfile = async (data: VendorSetupProfileData) => {
    'use server';
    try {
      await AuthService.completeVendorSetup(data);
      return { success: true };
    } catch (error) {
      console.error('[vendorSetup] save profile failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save vendor profile.',
      };
    }
  };

  const handleFinishSetup = async () => {
    'use server';
    try {
      const result = await AuthService.finalizeSetup();
      // Vendors are routed by vendorId (== roleId / auth uid for new signups).
      redirect(`/vendor/${result.userId}/dashboard`);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      console.error('[vendorSetup] finish setup failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finish setup.',
      };
    }
  };

  return (
    <VendorSetupClient
      email={user.email || ''}
      initialVerified={initialVerified}
      onCheckVerification={handleCheckVerification}
      onResendVerification={handleResendVerification}
      onSaveProfile={handleSaveProfile}
      onFinishSetup={handleFinishSetup}
    />
  );
}
