"use client"
import { useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { fieldClass } from '@/src/lib/ui';

export function AttendeeInput() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear any pending navigation on unmount.
    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const value = e.target.value;
         // Debounce so we navigate once the user pauses typing, instead of a
         // full server round-trip on every keystroke.
         if (debounceRef.current) clearTimeout(debounceRef.current);
         debounceRef.current = setTimeout(() => {
             const params = new URLSearchParams(searchParams.toString());
             if (value === "" || value === undefined) {
                 params.delete("value");
             } else {
                 params.set("value", value);
             }
             router.push(`${pathname}?${params.toString()}`);
         }, 300);
    }

    return (
        <div className="relative flex items-center w-full">
            {/* gray-400 is 2.5:1 -- decoration; the placeholder carries the label. */}
            <Search className="pointer-events-none absolute left-3 text-gray-400" size={16} aria-hidden="true" />
            <input
                type="search"
                onChange={handleOnChange}
                aria-label="Search attendees"
                placeholder="Search attendees by name"
                className={`${fieldClass} pl-9`}
            />
        </div>
    )
}