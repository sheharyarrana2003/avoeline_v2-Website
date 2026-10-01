'use client';

import React, { useState } from 'react';
import AddSocialsModal from './AddSocialsModal';
import ProfileLoadingState from './ProfileLoadingState';
import { ImagePlus, Plus, X } from 'lucide-react';
import { uploadMedia } from '@/src/features/media/uploadMedia.action';
import { buttonClass, fieldClass, labelClass } from '@/src/lib/ui';
import { FormFeedback } from '@/src/shared_components/ui/FormFeedback';
import type { VendorSetupProfileData } from '@/src/features/auth/authService';

type ActionResult = { success: boolean; error?: string };

interface VendorProfileStepProps {
  /** Completes setup. Redirects on success, so it usually never resolves. */
  onNext?: () => Promise<ActionResult | void> | void;
  onSave?: (data: VendorSetupProfileData) => Promise<ActionResult>;
  initialEmail?: string;
}

export default function VendorProfileStep({
  onNext,
  onSave,
  initialEmail = '',
}: VendorProfileStepProps) {
  const [isSocialsOpen, setIsSocialsOpen] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    description: '',
    address: '',
    email: initialEmail,
    contactNo: '',
    established: '',
    recoveryContact: '',
    website: '',
    link1: '',
  });

  const [serviceInput, setServiceInput] = useState<string>('');
  const [services, setServices] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'description' && value.length > 100) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddService = () => {
    if (serviceInput.trim()) {
      setServices([...services, serviceInput.trim()]);
      setServiceInput('');
    }
  };

  const handleServiceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddService();
    }
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let logoUrl: string | null = null;
      if (profileFile) {
        const fd = new FormData();
        fd.append('file', profileFile);
        fd.append('folder', 'vendor-logos');
        const upload = await uploadMedia(fd);
        if (!upload.success) {
          setError(upload.error || 'Logo upload failed.');
          setIsLoading(false);
          return;
        }
        logoUrl = upload.url;
      }

      const payload: VendorSetupProfileData = { ...formData, services, socialLinks, logoUrl };

      // Errors are shown here, beside the button that was pressed. The wizard used
      // to own this message and render it at the very top of the page, a screen and
      // a half above the Save button, so a rejected save looked like nothing at all
      // happening. Same reason the 800ms "Saved!" toast is gone: it re-enabled Save
      // while a redirect was already scheduled, and a second click re-ran the write.
      const saved: ActionResult = onSave ? await onSave(payload) : { success: true };
      if (!saved.success) {
        setError(saved.error || 'Failed to save vendor profile.');
        setIsLoading(false);
        return;
      }

      // Cast, not a wider prop type: onNext resolves to nothing on the success
      // path because the server action redirects out of this tree.
      const finished = (await onNext?.()) as ActionResult | undefined;
      if (finished && !finished.success) {
        setError(finished.error || 'Failed to finish setup.');
      }
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex w-full flex-col items-center">
      {isLoading && (
        <ProfileLoadingState
          title="Saving Vendor Profile"
          subtitle="Updating your business details, services, and profile settings..."
          isOverlay
        />
      )}

      <h1 className="mb-4 text-center font-display text-2xl text-ink">
        Set up your vendor profile
      </h1>

      <div className="w-full max-w-3xl rounded-2xl border border-line bg-paper p-8 md:max-w-4xl md:p-12">
        <form onSubmit={handleSubmit} className="flex w-full flex-col items-center">
          <div className="mb-8 flex flex-col items-center">
            {/* sr-only rather than hidden: a display:none input is unreachable by
                keyboard, which made the only avatar control mouse-only. */}
            <label
              htmlFor="vendor-logo"
              className="group relative block cursor-pointer rounded-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-900"
            >
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-line-loud bg-paper p-1">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Vendor logo preview"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-full border border-dashed border-line-loud text-center">
                    <ImagePlus className="h-7 w-7 text-ink-soft" aria-hidden="true" />
                    <span className="text-2xs font-medium uppercase text-ink-soft">Logo</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <ImagePlus className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <input
                id="vendor-logo"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="sr-only"
              />
            </label>
            <span className="mt-3 text-sm font-semibold uppercase text-ink">
              {formData.username || 'Your business'}
            </span>
          </div>

          <div className="mb-8 grid w-full grid-cols-1 gap-8 md:grid-cols-2">
            <div className="w-full space-y-3.5 text-left">
              <h2 className="border-b border-line pb-1.5 text-xs font-bold uppercase text-ink">
                Personal Information
              </h2>

              <div>
                <label htmlFor="vendor-username" className={labelClass}>Username</label>
                <input
                  id="vendor-username"
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="vendor-description" className={labelClass}>Description</label>
                <div className="relative mt-1 w-full">
                  <input
                    id="vendor-description"
                    type="text"
                    name="description"
                    placeholder="Description"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={100}
                    className={`${fieldClass} pr-16`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 my-auto h-fit text-xs text-ink-soft tabular-nums">
                    {formData.description.length}/100
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="vendor-address" className={labelClass}>Address</label>
                <input
                  id="vendor-address"
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="vendor-email" className={labelClass}>Email</label>
                <input
                  id="vendor-email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="vendor-contact" className={labelClass}>Contact No</label>
                <input
                  id="vendor-contact"
                  type="tel"
                  name="contactNo"
                  placeholder="Contact No"
                  value={formData.contactNo}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>
            </div>

            <div className="w-full space-y-3.5 text-left">
              <h2 className="border-b border-line pb-1.5 text-xs font-bold uppercase text-ink">
                Professional Information
              </h2>

              <div>
                <label htmlFor="vendor-established" className={labelClass}>Established</label>
                <input
                  id="vendor-established"
                  type="text"
                  name="established"
                  placeholder="Established"
                  value={formData.established}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1 tabular-nums`}
                />
              </div>

              <div>
                <label htmlFor="vendor-recovery" className={labelClass}>Recovery Contact</label>
                <input
                  id="vendor-recovery"
                  type="text"
                  name="recoveryContact"
                  placeholder="Recovery Contact"
                  value={formData.recoveryContact}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="vendor-services" className={labelClass}>Services</label>
                <div className="mt-1 space-y-2">
                  <div className="relative w-full">
                    <input
                      id="vendor-services"
                      type="text"
                      placeholder="Add a service, then press Enter"
                      value={serviceInput}
                      onChange={(e) => setServiceInput(e.target.value)}
                      onKeyDown={handleServiceKeyDown}
                      className={`${fieldClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={handleAddService}
                      aria-label="Add service"
                      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line-loud text-ink transition-colors hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {services.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 py-1">
                      {services.map((service, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-ink-invert"
                        >
                          {service}
                          <button
                            type="button"
                            onClick={() => handleRemoveService(idx)}
                            aria-label={`Remove ${service}`}
                            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:text-gray-300"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="vendor-website" className={labelClass}>Website</label>
                <input
                  id="vendor-website"
                  type="url"
                  name="website"
                  placeholder="Website"
                  value={formData.website}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>

              <div>
                <label htmlFor="vendor-link1" className={labelClass}>Link 1</label>
                <input
                  id="vendor-link1"
                  type="url"
                  name="link1"
                  placeholder="Link 1"
                  value={formData.link1}
                  onChange={handleChange}
                  className={`${fieldClass} mt-1`}
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-lg space-y-4">
            <FormFeedback error={error} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsSocialsOpen(true)}
                className={buttonClass('secondary', 'lg', 'w-full')}
              >
                Add Socials{' '}
                {socialLinks.filter((s) => s.url).length > 0 &&
                  `(${socialLinks.filter((s) => s.url).length})`}
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className={buttonClass('primary', 'lg', 'w-full')}
              >
                {isLoading ? 'Saving…' : 'Save and finish'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <AddSocialsModal
        isOpen={isSocialsOpen}
        onClose={() => setIsSocialsOpen(false)}
        initialLinks={socialLinks}
        onSave={(links) => setSocialLinks(links)}
      />
    </div>
  );
}
