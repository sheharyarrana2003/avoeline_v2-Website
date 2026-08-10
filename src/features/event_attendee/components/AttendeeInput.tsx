"use client"
import { useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

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
            <Search className="absolute left-5 text-gray-400" size={18} />
            <input 
                type="text" 
                onChange={handleOnChange}  
                placeholder="Search attendees by name, email or ID..." 
                className="w-full pl-12 pr-6 py-3 bg-white border border-gray-200/80 rounded-full text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm"
            />
        </div>
    )
}