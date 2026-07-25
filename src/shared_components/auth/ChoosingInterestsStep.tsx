'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ChoosingInterestsStepProps {
  onComplete?: (selectedInterests: string[]) => Promise<boolean | void> | boolean | void;
}

export default function ChoosingInterestsStep({
  onComplete,
}: ChoosingInterestsStepProps) {
  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
  const [completedSuccess, setCompletedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    {
      id: 'technology',
      title: 'Technology',
      items: [
        'Cybersecurity', 'Programming', 'IOT', 'AI',
        'Data Science', 'Cloud Computing', 'Web Dev', 'Mobile Dev'
      ],
    },
    {
      id: 'politics',
      title: 'Politics',
      items: [
        'Global Affairs', 'Governance', 'Elections', 'Public Policy',
        'International Relations', 'Diplomacy', 'Law', 'Economy'
      ],
    },
    {
      id: 'travel',
      title: 'Travel',
      items: [
        'Adventure', 'Ecotourism', 'Cultural Heritage', 'Solo Travel',
        'Luxury Travel', 'Backpacking', 'Photography', 'Food Tourism'
      ],
    },
  ];

  const toggleTag = (key: string) => {
    setSelectedTags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChoose = async () => {
    setError(null);
    setIsSaving(true);

    const selectedLabels = categories.flatMap((cat) =>
      cat.items
        .map((item, idx) => ({ key: `${cat.id}-${idx}`, label: item }))
        .filter(({ key }) => selectedTags[key])
        .map(({ label }) => label)
    );

    try {
      const ok = onComplete ? await onComplete(selectedLabels) : true;
      if (ok === false) {
        setIsSaving(false);
        return;
      }
      setCompletedSuccess(true);
      setTimeout(() => setCompletedSuccess(false), 1500);
    } catch (err: any) {
      // redirect() from a server action must not be swallowed
      if (
        typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : 'Failed to save interests.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl md:text-2xl font-bold text-gray-700 tracking-wide mb-4 text-center">
        Choosing Interests
      </h2>

      <div className="bg-[#F5F5F5] w-full max-w-3xl md:max-w-4xl rounded-[28px] p-8 md:p-12 border border-gray-300/60 shadow-sm font-sans relative flex flex-col items-center">
        {completedSuccess && (
          <div className="absolute top-6 bg-emerald-600 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-fadeIn z-20">
            <CheckCircle2 className="w-4 h-4" /> Preferences Saved!
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-full px-4 py-2">
            {error}
          </div>
        )}

        <div className="mb-3 flex flex-col items-center">
          <div className="w-12 h-12 text-black flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L4 28C4 28 8 32 12 32C16 32 20 28 24 28C28 28 32 32 36 32C40 32 44 28 44 28L24 4Z"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="18" r="2.5" fill="currentColor" />
              <circle cx="24" cy="18" r="2.5" fill="currentColor" />
              <circle cx="30" cy="18" r="2.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center max-w-md leading-snug mt-1 mb-8">
          In which things you actually interested in
        </h1>

        <div className="w-full space-y-8 text-left">
          {categories.map((cat) => (
            <div key={cat.id} className="w-full border-b border-gray-300/60 pb-6 last:border-b-0">
              <h3 className="text-xs md:text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                {cat.title}
              </h3>
              <div className="flex flex-wrap gap-3">
                {cat.items.map((item, idx) => {
                  const tagKey = `${cat.id}-${idx}`;
                  const isSelected = !!selectedTags[tagKey];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleTag(tagKey)}
                      className={`py-2.5 px-6 text-xs font-semibold rounded-full border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-black text-white border-black shadow-sm scale-102'
                          : 'bg-transparent text-gray-700 border-gray-400 hover:border-black hover:bg-gray-200/50'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleChoose}
          disabled={isSaving}
          className="bg-black text-white font-medium py-3.5 px-16 rounded-full hover:bg-gray-800 transition-colors text-sm shadow-sm mt-10 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Choose'}
        </button>
      </div>
    </div>
  );
}
