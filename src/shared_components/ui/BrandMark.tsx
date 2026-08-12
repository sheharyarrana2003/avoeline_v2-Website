/**
 * The Avoeline mark: a filled disc with a triangle cut out of it.
 *
 * Taken from app/favicon.ico, which is the only real logo asset in the repo —
 * there is no SVG or PNG of it anywhere, and public/ holds nothing but the
 * framework's defaults. Three different invented emblems were in the codebase
 * before this (a mountain with one dot, the same mountain with three, and a
 * stylised A with a crossbar on the marketing header), so the product showed a
 * different logo depending on which page you were on.
 *
 * Drawn rather than imported so it stays crisp at any size and can invert. The
 * triangle is a hole punched through the disc with fill-rule evenodd, not a white
 * shape painted on top — so on a dark surface the page shows through it instead
 * of a white triangle floating on nothing.
 */
export function BrandMark({
    className = "",
    inverted = false,
}: {
    className?: string;
    inverted?: boolean;
}) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`${inverted ? "text-white" : "text-gray-950"} ${className}`}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0ZM12 5.9 17.9 16.2H6.1L12 5.9Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default BrandMark;
