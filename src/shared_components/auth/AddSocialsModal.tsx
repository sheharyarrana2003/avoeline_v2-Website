'use client';

import React, { useState } from 'react';
import { X, Globe, Plus } from 'lucide-react';

interface AddSocialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLinks?: { platform: string; url: string }[];
  onSave?: (links: { platform: string; url: string }[]) => void;
}

export default function AddSocialsModal({
  isOpen,
  onClose,
  initialLinks = [],
  onSave,
}: AddSocialsModalProps) {
  const [links, setLinks] = useState<{ platform: string; url: string }[]>(
    initialLinks.length > 0
      ? initialLinks
      : [
          { platform: 'Instagram', url: '' },
          { platform: 'LinkedIn', url: '' },
          { platform: 'Facebook', url: '' },
          { platform: 'Twitter', url: '' },
        ]
  );

  if (!isOpen) return null;

  const handleUrlChange = (index: number, url: string) => {
    const updated = [...links];
    updated[index].url = url;
    setLinks(updated);
  };

  const handleAddCustom = () => {
    setLinks([...links, { platform: 'Other Link', url: '' }]);
  };

  const handleRemove = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (onSave) onSave(links);
    onClose();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return (
          <svg aria-hidden="true" className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        );
      case 'linkedin':
        return (
          <svg aria-hidden="true" className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
        );
      case 'facebook':
        return (
          <svg aria-hidden="true" className="w-4 h-4 text-blue-800" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z"/>
          </svg>
        );
      case 'twitter':
      case 'x':
        return (
          <svg aria-hidden="true" className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
          </svg>
        );
      default:
        return <Globe className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Add Social Profiles</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {links.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                {getPlatformIcon(item.platform)}
              </div>
              <input
                type="url"
                placeholder={`${item.platform} URL`}
                value={item.url}
                onChange={(e) => handleUrlChange(idx, e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddCustom}
            className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black py-2 px-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add another platform
          </button>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-full text-xs hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-black text-white font-medium py-2.5 rounded-full text-xs hover:bg-gray-800 transition-colors shadow-sm"
          >
            Save Socials
          </button>
        </div>
      </div>
    </div>
  );
}
