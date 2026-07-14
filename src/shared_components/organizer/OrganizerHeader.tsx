"use client";

import { CurrentUserData } from "@/src/services/models/user.type";
import Link from "next/link";
import { usePathname } from "next/navigation";


export function OrganizerHeader({ user }: { user: CurrentUserData }) {
    const current_tab = usePathname();
    console.log("idk where i am but this is thre path ",current_tab);
    
    const basePath = `/organizer/${user.userId}`;
    console.log("basaePAtj is ",basePath," => ",user.userId)

    return (
        <header className="flex items-center justify-between px-6 py-4 border-b">

            <div className="font-bold text-xl">
                <Link href={`${basePath}/dashboard`}>Avoeline</Link>
            </div>

            <nav>
                <ul className="flex space-x-6">
                    <li>
                        <Link 
                            href={`${basePath}/dashboard`} 
                            className={current_tab === `${basePath}/dashboard` ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                        >
                            Dashboard
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={`${basePath}/events`}
                            className={current_tab.includes(`${basePath}/events`) ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                        >
                            Events
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={`${basePath}/analytics`}
                            className={current_tab.includes(`${basePath}/analytics`) ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                        >
                            Analytics
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={`${basePath}/vendor-marketplace`}
                            className={current_tab.includes(`${basePath}/vendor-marketplace`) ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                        >
                            Vendors
                        </Link>
                    </li>
                    <li>
                        <Link 
                            href={`${basePath}/notifications`} 
                            className={current_tab === `${basePath}/notifications` ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                        >
                            Notifications
                        </Link>
                    </li>
                    <li>
                        <Link 
                            href={`${basePath}/quotes`} 
                            className={current_tab === `${basePath}/quotes` ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                        >
                            Quotes
                        </Link>
                    </li>
                </ul>
            </nav>
            
            {/* 3. The User Profile area */}
            <div className="flex items-center space-x-4">
                {/* Kept the profile route as an example, adjust if you have a specific settings route */}
                <Link href={`${basePath}/profile`} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                    {/* Ensure the initial is always uppercase */}
                    {user.name.charAt(0).toUpperCase()}
                </Link>
                <p className="font-medium">{user.name}</p>
            </div>

        </header>
    );
}