// app/api/events/route.ts
import { NextResponse } from "next/server";

const mockEvents = [
  {
    id: "evt_001",
    title: "FAST Tech Summit 2025",
    date: "2025-03-15",
    location: "FAST University, Lahore",
    capacity: 500,
    registered: 342,
    status: "upcoming",
    ticketPrice: 0,
    revenue: 0,
  },
  {
    id: "evt_002",
    title: "Corporate Leadership Training",
    date: "2025-03-20",
    location: "Avari Hotel, Lahore",
    capacity: 50,
    registered: 48,
    status: "almost-full",
    ticketPrice: 15000,
    revenue: 720000,
  },
  {
    id: "evt_003",
    title: "UI/UX Design Workshop",
    date: "2025-04-05",
    location: "LUMS, Lahore",
    capacity: 80,
    registered: 20,
    status: "upcoming",
    ticketPrice: 2500,
    revenue: 50000,
  },
];

export async function GET() {
  // simulate network delay
  await new Promise((res) => setTimeout(res, 500));
  return NextResponse.json({ success: true, data: mockEvents });
}

export async function POST(request: Request) {
  const body = await request.json();
  await new Promise((res) => setTimeout(res, 800));

  const newEvent = {
    ...body,
    id: `evt_${Date.now()}`,
    registered: 0,
    revenue: 0,
    status: "draft",
  };

  return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
}