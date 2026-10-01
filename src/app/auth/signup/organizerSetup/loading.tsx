import ProfileLoadingState from '@/src/shared_components/auth/ProfileLoadingState';

export default function OrganizerSetupLoading() {
  return (
    <ProfileLoadingState
      title="Setting Up Organizer Profile"
      subtitle="Loading organizer setup options and profile details..."
    />
  );
}
