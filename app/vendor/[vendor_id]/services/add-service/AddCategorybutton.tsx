'use client';

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

export default function AddCategoryButton() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const isAdding = searchParams.get('addCategory') === 'true';

    const toggle = () => {
        const params = new URLSearchParams(searchParams);
        if (isAdding) {
            params.delete('addCategory');
        } else {
            params.set('addCategory', 'true');
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <button type="button" onClick={toggle} className={buttonClass("ghost", "sm")}>
            {isAdding ? (
                "Select existing"
            ) : (
                <>
                    <Plus size={14} aria-hidden="true" />
                    New category
                </>
            )}
        </button>
    );
}