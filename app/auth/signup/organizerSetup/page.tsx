import { AuthService, OrganizerSetupProfileData } from '@/src/features/auth/authService';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import OrganizerSetupClient from './OrganizerSetupClient';

export default async function SignUpOrganizerPage() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    redirect('/auth/signup');
  }
  if (String(user.userType).toLowerCase() !== 'organizer') {
    redirect('/auth/signup');
  }

  const handleSaveProfile = async (data: OrganizerSetupProfileData) => {
    'use server';
    try {
      await AuthService.completeOrganizerSetup(data);
      return { success: true };
    } catch (error) {
      console.error('[organizerSetup] save profile failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save organizer profile.',
      };
    }
  };

  const handleCompleteInterests = async (interests: string[]) => {
    'use server';
    try {
      const result = await AuthService.completeSetupInterests(interests);
      redirect(`/organizer/${result.userId}/dashboard`);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      console.error('[organizerSetup] save interests failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save interests.',
      };
    }
  };

  return (
    <OrganizerSetupClient
      email={user.email || ''}
      onSaveProfile={handleSaveProfile}
      onCompleteInterests={handleCompleteInterests}
    />
  );
}
