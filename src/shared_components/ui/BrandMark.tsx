/**
 * The Avoeline mark: a stylised A — a peak with a crossbar.
 *
 * This is the shape the marketing header has always used. It existed only as
 * inline SVG in three unrelated files, one of which drew a completely different
 * emblem, so the product showed two different logos depending on where you were.
 * One definition, so that cannot happen again.
 *
 * `inverted` flips it for a dark surface: on the marketing site the tile is black
 * with a white glyph, on the dashboard rail it is the other way round.
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
            className={`flex items-center justify-center rounded-lg ${
                inverted ? "bg-white text-gray-950" : "bg-gray-950 text-white"
            } ${className}`}
        >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-[55%] w-[55%]">
                <path
                    d="M3 12L8 4L13 12"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path d="M5.5 9.5H10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        </span>
    );
}

export default BrandMark;
