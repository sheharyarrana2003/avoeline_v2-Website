import Link from "next/link";

/**
 * The link row that used to sit here pointed at /help, /privacy and /terms.
 * None of those routes existed, so all three 404'd -- a footer full of dead
 * links is worse than a footer without them, and the note here said they come
 * back when the pages do.
 *
 * /support is the first one that does (spec 9.7). Privacy and terms still do
 * not exist and are still left out.
 */
export function OrganizerFooter() {
    return (
        <footer className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-5">
            <p className="text-sm text-ink-soft">
                © {new Date().getFullYear()} Avoeline Event Systems. All rights reserved.
            </p>
            <Link href="/support" className="text-sm text-ink-soft hover:text-ink">
                Support
            </Link>
        </footer>
    );
}
