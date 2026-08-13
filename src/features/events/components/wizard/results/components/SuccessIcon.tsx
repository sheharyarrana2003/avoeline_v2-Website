export default function SuccessIcon() {
  return (
    <div className="flex justify-center mb-6">
      <div className="bg-ink rounded-full w-20 h-20 flex items-center justify-center">
        {/* text-ink-invert, not text-white: the disc behind it is bg-ink, which is
            near-white in dark mode — a white tick on it would vanish. The pub-succ
            page's equivalent chip already pairs the two correctly. */}
        <svg aria-hidden="true"
          className="w-10 h-10 text-ink-invert"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={3.5} 
            d="M5 13l4 4L19 7" 
          />
        </svg>
      </div>
    </div>
  );
}