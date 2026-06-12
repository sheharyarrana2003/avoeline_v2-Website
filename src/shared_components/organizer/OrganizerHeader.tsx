"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
interface UserProp {
    id: string,
    name: string,
    role: string,
    email: string,
}

export function OrganizerHeader({ user }: { user: UserProp }) {
    // const events = await EventController.getAllEvents();
    const current_tab = usePathname();
    console.log(current_tab)

    return (
        <>
            <header className="flex items-center justify-between px-6 py-4 border-b">

                {/* 1. The Logo area */}
                <div className="font-bold text-xl">
                    <Link href="/organizer">Avoeline</Link>
                </div>

                {/* 2. The Navigation area */}
                <nav>
                    <ul className="flex space-x-6">
                        <li>
                            <Link href="/organizer/dashboard" className={current_tab === "/organizer/dashboard" ? "font-bold text-black" : "text-gray-500 hover:text-black"}>
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/organizer/events"
                                className={current_tab.includes("/organizer/events") ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                            >
                                Events
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/organizer/analytics"
                                className={current_tab.includes("/organizer/analytics") ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                            >
                                Analytics
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/organizer/vendor"
                                className={current_tab.includes("/organizer/vendor") ? "font-bold text-black" : "text-gray-500 hover:text-black"}
                            >
                                Vendor
                            </Link>
                        </li>
                        <li>
                            <Link href="/organizer/financials" className={current_tab === "/organizer/financials" ? "font-bold text-black" : "text-gray-500 hover:text-black"}>
                                Financials
                            </Link>
                        </li>
                        <li>
                            <Link href="/organizer/notifications" className={current_tab === "/organizer/notifications" ? "font-bold text-black" : "text-gray-500 hover:text-black"}>
                                Notifications
                            </Link>
                        </li>

                    </ul>
                </nav>
                

                {/* 3. The User Profile area */}
                <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {/* A quick trick to get the user's initial */}
                        {user.name.charAt(0)}
                    </div>
                    <p className="font-medium">{user.name}</p>
                </div>

            </header>

        </>
    );
}
