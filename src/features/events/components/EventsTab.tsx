
import Link from "next/link"
export function EventsTab({ currentTab }: { currentTab: string }) {
    return (
        <><h6>tabs</h6>
        {console.log(currentTab)}
            <div className="flex space-x-6 border-b border-gray-200 mb-6 pb-2">
                <Link
                    href="/organizer/events"
                    className={currentTab === "all" ? "font-bold text-black border-b-2 border-black" : "text-gray-500"}
                >
                    All Events
                </Link>

                <Link
                    href="/organizer/events?status=draft"
                    className={currentTab === "draft" ? "font-bold text-black border-b-2 border-black" : "text-gray-500"}
                >
                    Draft
                </Link>

                <Link
                    href="/organizer/events?status=published"
                    className={currentTab === "published" ? "font-bold text-black border-b-2 border-black" : "text-gray-500"}
                >
                    Published
                </Link>

                <Link
                    href="/organizer/events?status=ongoing"
                    className={currentTab === "ongoing" ? "font-bold text-black border-b-2 border-black" : "text-gray-500"}
                >
                    OnGoing
                </Link>

                <Link
                    href="/organizer/events?status=completed"
                    className={currentTab === "completed" ? "font-bold text-black border-b-2 border-black" : "text-gray-500"}
                >
                    Completed
                </Link>
                <Link
                    href="/organizer/events?status=cancelled"
                    className={currentTab === "cancelled" ? "font-bold text-black border-b-2 border-black" : "text-gray-500"}
                >
                    Cancelled
                </Link>
            </div>
        </>

    )
}