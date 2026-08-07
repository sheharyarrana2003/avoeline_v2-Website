// src/components/layouts/organizer/OrganizerFooter.tsx
import Link from "next/link";

export function OrganizerFooter() {
    return (
        <footer className="w-full border-t border-gray-200 bg-gray-50 px-6 py-5 mt-auto">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
                
                {/* Left Side: Copyright */}
                <div className="mb-4 md:mb-0">
                    <p>© {new Date().getFullYear()} Avoeline Event Systems. All rights reserved.</p>
                </div>

                {/* Right Side: Links */}
                <nav className="flex space-x-6 font-semibold tracking-wider text-gray-400 text-xs">
                    <Link href="/help" className="hover:text-gray-700 transition-colors">
                        HELP CENTER
                    </Link>
                    <Link href="/privacy" className="hover:text-gray-700 transition-colors">
                        PRIVACY
                    </Link>
                    <Link href="/terms" className="hover:text-gray-700 transition-colors">
                        TERMS
                    </Link>
                </nav>

            </div>
        </footer>
    );
}