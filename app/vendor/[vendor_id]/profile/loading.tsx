import ProfileLoadingState from '@/src/shared_components/auth/ProfileLoadingState';

export default function VendorProfileLoading() {
  return (
    <ProfileLoadingState
      title="Loading Vendor Profile"
      subtitle="Fetching business details, services, and profile settings..."
    />
  );
}
