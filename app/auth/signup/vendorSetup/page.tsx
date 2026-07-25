import { AuthService, VendorSetupProfileData } from '@/src/features/auth/authService';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import VendorSetupClient from './VendorSetupClient';

export default async function SignUpVendorPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect('/auth/signup');
  }
  if (String(user.userType).toLowerCase() !== 'vendor') {
    redirect('/auth/signup');
  }

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

  const handleCompleteInterests = async (interests: string[]) => {
    'use server';
    try {
      const result = await AuthService.completeSetupInterests(interests);
      // Vendors are routed by vendorId (== roleId / auth uid for new signups).
      redirect(`/vendor/${result.userId}/dashboard`);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      console.error('[vendorSetup] save interests failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save interests.',
      };
    }
  };

  return (
    <VendorSetupClient
      email={user.email || ''}
      onSaveProfile={handleSaveProfile}
      onCompleteInterests={handleCompleteInterests}
    />
  );
}
