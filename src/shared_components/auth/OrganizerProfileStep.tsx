'use client';

import React, { useState } from 'react';
import AddSocialsModal from './AddSocialsModal';
import ProfileLoadingState from './ProfileLoadingState';
import { Camera, CheckCircle2 } from 'lucide-react';

interface OrganizerProfileStepProps {
  onNext?: () => void;
  onSave?: (data: any) => void;
}

export default function OrganizerProfileStep({
  onNext,
  onSave,
}: OrganizerProfileStepProps) {
  const [isSocialsOpen, setIsSocialsOpen] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [organizerName, setOrganizerName] = useState<string>('OPA');

  const [formData, setFormData] = useState({
    username: '',
    description: '',
    address: '',
    email: '',
    contactNo: '',
    established: '',
    recoveryContact: '',
    website: '',
    link1: '',
  });

  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'description' && value.length > 100) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (onSave) onSave({ ...formData, profileImage, socialLinks });
    setTimeout(() => {
      setIsLoading(false);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onNext) onNext();
      }, 1000);
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col items-center relative">
      {isLoading && (
        <ProfileLoadingState
          title="Saving Organizer Profile"
          subtitle="Saving your organization details and updating settings..."
          isOverlay
        />
      )}

      {/* Header title outside card */}
      <h2 className="text-xl md:text-2xl font-bold text-gray-700 tracking-wide mb-4 text-center">
        Setting Up Organizer Profile
      </h2>

      {/* Main Desktop Card - bg-[#F5F5F5] matching Signin/Signup */}
      <div className="bg-[#F5F5F5] w-full max-w-3xl md:max-w-4xl rounded-[28px] p-8 md:p-12 border border-gray-300/60 shadow-sm font-sans relative">
        {savedSuccess && (
          <div className="absolute top-6 right-6 bg-emerald-600 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-fadeIn z-20">
            <CheckCircle2 className="w-4 h-4" /> Profile Saved Successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          {/* Circular Logo / Avatar Container */}
          <div className="flex flex-col items-center mb-8">
            <label className="relative group cursor-pointer block">
              <div className="w-28 h-28 rounded-full border-2 border-[#407BFF] p-1 flex items-center justify-center bg-white shadow-sm overflow-hidden transition-transform group-hover:scale-105">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Organizer Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  // Default OPA UMT logo design
                  <div className="w-full h-full rounded-full border border-sky-200 flex flex-col items-center justify-center bg-sky-50/40 p-2 text-center">
                    <svg className="w-9 h-9 text-[#0055A5] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="4" fill="#0055A5" />
                    </svg>
                    <span className="text-[8px] font-bold text-[#0055A5] leading-none uppercase tracking-wider">OPA UMT</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <span className="text-sm font-bold text-gray-900 uppercase tracking-widest mt-3">
              {formData.username || organizerName}
            </span>
          </div>

          {/* Desktop 2-Column Form Layout with project-consistent inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8">
            {/* Column 1: Personal Information */}
            <div className="w-full text-left space-y-3.5">
              <h3 className="text-xs md:text-sm font-bold text-gray-900 uppercase tracking-wider pb-1.5 border-b border-gray-300">
                Personal Information
              </h3>
              
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Description</label>
                <div className="relative w-full">
                  <input
                    type="text"
                    name="description"
                    placeholder="Description"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full pl-5 pr-16 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-normal pointer-events-none">
                    {formData.description.length}/100
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Contact No</label>
                <input
                  type="tel"
                  name="contactNo"
                  placeholder="Contact No"
                  value={formData.contactNo}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>

            {/* Column 2: Professional Information */}
            <div className="w-full text-left space-y-3.5">
              <h3 className="text-xs md:text-sm font-bold text-gray-900 uppercase tracking-wider pb-1.5 border-b border-gray-300">
                Professional Information
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Established</label>
                <input
                  type="text"
                  name="established"
                  placeholder="Established"
                  value={formData.established}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Recovery Contact</label>
                <input
                  type="text"
                  name="recoveryContact"
                  placeholder="Recovery Contact"
                  value={formData.recoveryContact}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Website</label>
                <input
                  type="url"
                  name="website"
                  placeholder="Website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1 ml-3">Link 1</label>
                <input
                  type="url"
                  name="link1"
                  placeholder="Link 1"
                  value={formData.link1}
                  onChange={handleChange}
                  className="w-full px-5 py-2.5 border border-gray-400 bg-transparent rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <button
              type="button"
              onClick={() => setIsSocialsOpen(true)}
              className="w-full bg-black text-white font-medium py-3 rounded-full hover:bg-gray-800 transition-colors text-sm shadow-sm cursor-pointer"
            >
              Add Socials {socialLinks.filter((s) => s.url).length > 0 && `(${socialLinks.filter((s) => s.url).length})`}
            </button>

            <button
              type="submit"
              className="w-full bg-black text-white font-medium py-3 rounded-full hover:bg-gray-800 transition-colors text-sm shadow-sm cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      {/* Modal for adding socials */}
      <AddSocialsModal
        isOpen={isSocialsOpen}
        onClose={() => setIsSocialsOpen(false)}
        initialLinks={socialLinks}
        onSave={(links) => setSocialLinks(links)}
      />
    </div>
  );
}
