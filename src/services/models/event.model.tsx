// src/models/event.model.ts

export type EventStatus =
    | "draft"
    | "published"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "almost-full";

export type EventCategory =
    | "hackathon"
    | "conference"
    | "workshop"
    | "seminar"
    | "webinar"
    | "networking"
    | "training"
    | "custom";

export interface Event {
    id: string;
    title: string;
    description: string;
    category: EventCategory;
    date: string;
    time: string;
    location: string;
    capacity: number;
    registered: number;
    status: EventStatus;
    ticketPrice: number;
    revenue: number;
    organizerId: string;
    imageUrl?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateEventDTO {
    title: string;
    description: string;
    category: EventCategory;
    date: string;
    time: string;
    location: string;
    capacity: number;
    ticketPrice: number;
    imageUrl?: string;
    tags?: string[];
}

export interface UpdateEventDTO extends Partial<CreateEventDTO> {
    status?: EventStatus;
}

export interface EventStats {
    totalEvents: number;
    activeEvents: number;
    totalRegistrations: number;
    totalRevenue: number;
    avgRating: number;
    publishedCount: number;
    draftCount: number;
    ongoingCount: number;
    completedCount: number;
    cancelledCount: number;
}