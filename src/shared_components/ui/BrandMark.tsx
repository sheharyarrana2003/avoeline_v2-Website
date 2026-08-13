/**
 * The Avoeline mark: a disc with its lower-right corner squared off, carrying an
 * outlined triangle with a dot at its centre.
 *
 * There is no logo file in this repository — public/ holds only the framework's
 * defaults, and app/favicon.ico turns out to be an older, simpler version of the
 * mark (a solid triangle, no outline, no dot) so it is not a usable source. This
 * is traced from the supplied artwork.
 *
 * The blob is border-radius rather than an SVG arc. Three round corners and one
 * square one is exactly what `rounded-full rounded-br-none` describes, whereas as
 * a path it is two arcs and two lines whose sweep flags are easy to get subtly
 * wrong — and were, twice.
 */
export function BrandMark({
    className = "",
    inverted = false,
}: {
    className?: string;
    inverted?: boolean;
}) {
    return (
        <span
            aria-hidden="true"
            className={`inline-flex shrink-0 items-center justify-center rounded-full rounded-br-none ${
                inverted ? "bg-white text-gray-950" : "bg-ink text-ink-invert"
            } ${className}`}
        >
            {/* Nudged up and left, because the squared corner puts the blob's optical
                centre above and left of its bounding box centre. */}
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-[47%] w-[47%] -translate-x-[4%] -translate-y-[4%]"
            >
                <path
                    d="M12 3.5 21.5 20H2.5L12 3.5Z"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinejoin="round"
                />
                <circle cx="12" cy="14.3" r="2.2" fill="currentColor" />
            </svg>
        </span>
    );
}

export default BrandMark;
