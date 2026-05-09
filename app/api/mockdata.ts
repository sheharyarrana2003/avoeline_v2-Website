export const mockEvents = [
  { id: "evt_001", title: "FAST Tech Summit 2025", date: "2025-03-15", location: "FAST University, Lahore", capacity: 500, registered: 342, status: "upcoming", ticketPrice: 0, revenue: 0 },
  { id: "evt_002", title: "Corporate Leadership Training", date: "2025-03-20", location: "Avari Hotel, Lahore", capacity: 50, registered: 48, status: "almost-full", ticketPrice: 15000, revenue: 720000 },
  { id: "evt_003", title: "UI/UX Design Workshop", date: "2025-04-05", location: "LUMS, Lahore", capacity: 80, registered: 20, status: "upcoming", ticketPrice: 2500, revenue: 50000 }
];

export const mockAttendees = [
  { id: "att_1", name: "Ahmed Ali", email: "ahmed@example.com", status: "Checked-in", eventId: "evt_001" },
  { id: "att_2", name: "Sara Khan", email: "sara@example.com", status: "Registered", eventId: "evt_001" }
];

export const mockVendors = [
  { id: "v_1", name: "Perfect Catering", category: "Food", rating: 4.8, status: "active" },
  { id: "v_2", name: "Lumina AV", category: "Audio/Visual", rating: 4.5, status: "active" }
];

export const mockQuotes = [
  { id: "q_101", vendorId: "v_1", eventId: "evt_003", amount: 45000, status: "pending" },
  { id: "q_102", vendorId: "v_2", eventId: "evt_001", amount: 15000, status: "accepted" }
];

export const mockBookings = [
  { id: "bk_001", eventName: "UI/UX Workshop", date: "2025-04-05", ticketType: "VIP", price: 2500, status: "confirmed" },
  { id: "bk_002", eventName: "FAST Tech Summit", date: "2025-03-15", ticketType: "Standard", price: 0, status: "attended" }
];

export const mockAnalytics = {
  organizer: { total_revenue: 1250000, total_tickets: 850, active_events: 5, growth: "+12%" }
};

export const mockCertificates = [
  { id: "cert_001", eventName: "FAST Tech Summit", issuedAt: "2025-03-20", attendeeName: "Ahmed Ali" }
];

export const mockSpeakers = [
  { id: "spk_1", name: "Dr. Arshad", role: "Keynote Speaker", bio: "AI Expert", eventId: "evt_001" }
];
