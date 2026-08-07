"use client";

import { useToast } from "@/src/shared_components/ui/Toast";

interface ShareRowProps {
  eventUrl: string;
  eventTitle: string;
}

export default function ShareRow({ eventUrl, eventTitle }: ShareRowProps) {
  const toast = useToast();

  const handleShare = async () => {
    if (!navigator.share) {
      // No share sheet on this browser, so fall back to the clipboard rather
      // than showing the user a URL they then have to select by hand.
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({ title: eventTitle, url: eventUrl });
    } catch (err) {
      // Dismissing the share sheet rejects with AbortError; that is not a failure.
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Could not open the share menu. The link was not shared.");
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success("Event link copied to your clipboard.");
    } catch {
      toast.error("Could not copy the link. Your browser blocked clipboard access.");
    }
  };

  return (
    <div className="flex justify-center items-center gap-6 text-sm">
      <button 
        onClick={handleShare}
        className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share Event
      </button>
      
      <button 
        onClick={handleCopyLink}
        className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy Link
      </button>
    </div>
  );
}