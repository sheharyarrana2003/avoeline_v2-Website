'use client';

import { useSearchParams, useRouter, usePathname } from "next/navigation";

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
        <button
            type="button"
            onClick={toggle}
            className="text-xs font-semibold text-gray-500 hover:text-black transition-colors flex items-center gap-1 focus:outline-none"
        >
            {isAdding ? (
                <span>Select Existing</span>
            ) : (
                <>
                    <span className="text-gray-900 font-bold text-sm line-none">+</span>
                    <span>Custom Category</span>
                </>
            )}
        </button>
    );
}