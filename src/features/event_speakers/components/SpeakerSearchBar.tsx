"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SpeakerSearchBar() {
   
    return (
        <input 
            type="text" 
            placeholder="Search speakers..." 
        />
    );
}