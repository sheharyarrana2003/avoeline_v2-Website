"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface UserProp {
    id: string;
    name: string;
    role: string;
    email: string;
}

export function VendorHeader({ user }: { user: UserProp }) {
    const current_tab = usePathname();
    
    const basePath = `/vendor/${user.id}`;
    const tabs = ['Dashboard','Quotes','Services','Bookings'];
    

    return (
        <header className="flex items-center justify-between px-6 py-4 border-b">

            <div className="font-bold text-xl">
                <Link href={`${basePath}/dashboard`}>Avoeline</Link>
            </div>

            <nav>
                <ul className="flex space-x-6">

                    {tabs.map(x=>(
                        <li>
                            <Link
                             href={`${basePath}/${x.toLowerCase()}`}
                             className={current_tab === `${basePath}/${x.toLowerCase()}` ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                             >
                                {x}
                            </Link>
                        </li>
                    ))}
                    
                </ul>
            </nav>
            
            <div className="flex items-center space-x-4">
                <Link href={`${basePath}/profile`} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                    {user.name.charAt(0).toUpperCase()}
                </Link>
                <p className="font-medium">{user.name}</p>
            </div>

        </header>
    );
}