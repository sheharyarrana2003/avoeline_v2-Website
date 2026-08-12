"use client";
import { Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { fieldClass } from "@/src/lib/ui";

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
        <div className="relative w-full">
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-ink-soft"
            />
            <input
                className={`${fieldClass} pl-10`}
                type="search"
                aria-label="Search speakers"
                placeholder="Search speakers by name, company or session..."
                onChange={(e) => { handleChange(e.target.value) }}
                // Fixed: Make sure this matches the key you are setting in handleChange
                defaultValue={searchParams.get("input_val")?.toString() || ""}
            />
        </div>
    );
}
