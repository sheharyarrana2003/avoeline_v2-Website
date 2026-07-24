import ProfileLoadingState from '@/src/shared_components/auth/ProfileLoadingState';

export default function VendorSetupLoading() {
  return (
    <ProfileLoadingState
      title="Setting Up Vendor Profile"
      subtitle="Loading vendor setup options and service preferences..."
    />
  );
}
