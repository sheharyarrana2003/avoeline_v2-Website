"use client";

import { CurrentUserData } from "@/src/services/models/user.type";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/src/shared_components/NotificationBell";

export function VendorHeader({ user, logoUrl, unreadCount = 0 }: { user: CurrentUserData; logoUrl?: string; unreadCount?: number }) {
    const current_tab = usePathname();

    const basePath = `/vendor/${user.roleId}`;
    const tabs = ['Dashboard','Quotes','Services','Bookings'];
    

    return (
        <header className="flex items-center justify-between px-6 py-4 border-b">

            <div className="font-bold text-xl">
                <Link href={`${basePath}/dashboard`}>Avoeline</Link>
            </div>

            <nav>
                <ul className="flex space-x-6">

                    {tabs.map(x=>(
                        <li key={x}>
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
                <NotificationBell href={`${basePath}/notifications`} unreadCount={unreadCount} />
                <Link href={`${basePath}/profile`} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden font-semibold text-gray-700">
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        user?.name?.charAt(0)?.toUpperCase() ?? "?"
                    )}
                </Link>
                <p className="font-medium">{user?.name ?? ""}</p>
            </div>

        </header>
    );
}