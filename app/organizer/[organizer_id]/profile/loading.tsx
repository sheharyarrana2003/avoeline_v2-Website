import ProfileLoadingState from '@/src/shared_components/auth/ProfileLoadingState';

export default function OrganizerProfileLoading() {
  return (
    <ProfileLoadingState
      title="Loading Organizer Profile"
      subtitle="Retrieving account settings and organization records..."
    />
  );
}
