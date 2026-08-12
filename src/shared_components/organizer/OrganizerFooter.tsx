/**
 * The link row that used to sit here pointed at /help, /privacy and /terms.
 * None of those routes exist, so all three 404'd -- a footer full of dead links
 * is worse than a footer without them. They come back when the pages do.
 */
export function OrganizerFooter() {
    return (
        <footer className="mt-auto w-full border-t border-line px-6 py-5">
            <p className="text-sm text-ink-soft">
                © {new Date().getFullYear()} Avoeline Event Systems. All rights reserved.
            </p>
        </footer>
    );
}