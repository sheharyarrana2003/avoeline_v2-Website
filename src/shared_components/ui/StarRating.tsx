const SIZE = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
} as const;

export type StarRatingProps = {
    rating: number;
    size?: keyof typeof SIZE;
    /** Invert for dark backgrounds (the vendor hero banner). */
    light?: boolean;
};

/**
 * Five stars, filled to the nearest half. Replaces four local copies that had
 * drifted onto three different active colours -- indigo, gray-900 and black.
 *
 * The whole row is one labelled image: five unlabelled SVGs told a screen
 * reader nothing at all, and "Rated 4.5 out of 5" is the only part that matters.
 */
export function StarRating({ rating, size = "sm", light = false }: StarRatingProps) {
    const value = rating || 0;
    const full = Math.floor(value);
    const hasHalf = value % 1 >= 0.5;

    const active = light ? "text-white fill-white" : "text-ink fill-ink";
    const inactive = light ? "text-white/25 fill-white/25" : "text-line-loud fill-line-loud";

    return (
        <div
            className="flex items-center gap-0.5"
            role="img"
            aria-label={`Rated ${value % 1 === 0 ? value : value.toFixed(1)} out of 5`}
        >
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    aria-hidden="true"
                    className={`${SIZE[size]} ${i < full || (i === full && hasHalf) ? active : inactive}`}
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

export default StarRating;
