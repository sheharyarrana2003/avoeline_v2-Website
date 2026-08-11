"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SpeakerSearchBar() {
    const router = useRouter();
    const resolveParam = usePathname();
    const searchParams = useSearchParams();

    const handleChange = (term: string) => {
        const params = new URLSearchParams(searchParams);
        
        if (term) {
            params.set("input_val", term);
        } else {
            params.delete("input_val");
        }
        
        // Using replace prevents filling up the browser history with every keystroke
        router.replace(`${resolveParam}?${params.toString()}`);
    }

    return (
        <div className="relative w-full shadow-sm rounded-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {/* Search Icon */}
                <svg aria-hidden="true" className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </div>
            <input 
                className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-full text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                type="text" 
                placeholder="Search speakers by name, company or session..." 
                onChange={(e) => { handleChange(e.target.value) }}
                // Fixed: Make sure this matches the key you are setting in handleChange
                defaultValue={searchParams.get("input_val")?.toString() || ""}
            />
        </div>
    );
}