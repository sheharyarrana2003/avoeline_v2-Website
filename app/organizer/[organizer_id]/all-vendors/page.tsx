import Link from "next/link";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingsCard } from "@/src/features/bookings/shared_components/BookingsCard";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Active_Vendors({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab?.toString() || "active"; // Default to active

  //! hardcoded isko sah larna ha
  const organizerId = "org_001";
  const bookings = await BookingServices.getBookingsOfOrganizer(organizerId);

  // Filter logic
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "active") {
      return b.status !== "completed" && b.status !== "cancelled";
    } else if (activeTab === "past") {
      return b.status === "completed";
    } else {
      return b.status === "cancelled";
    }
  });

  return (
    <div className="min-h-screen bg-[#f9fafb] p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === "active" && "Active Bookings"}
              {activeTab === "past" && "Past Bookings"}
              {activeTab === "cancelled" && "Cancelled Bookings"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Manage and track your ongoing vendor bookings and service statuses.
            </p>
          </div>

          {/* Search Bar (Matches Top Right of Image) */}
          <div className="relative w-full md:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Search by vendor or service..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-4">
          <Link
            href="/organizer/all-vendors?tab=active"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "active" ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Active
          </Link>
          <Link
            href="/organizer/all-vendors?tab=past"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "past" ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Past
          </Link>
          <Link
            href="/organizer/all-vendors?tab=cancelled"
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === "cancelled" ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Cancelled
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((b) => (
              <BookingsCard key={b.bookingId} booking={b} />
            ))
          ) : (
            <p className="text-gray-500 text-sm">No bookings found for this category.</p>
          )}
        </div>

      </div>
    </div>
  );
}