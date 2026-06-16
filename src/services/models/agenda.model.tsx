export interface Speaker {
	id: string;
	name: string;
	avatarUrl: string;
	role?: string;
	company?: string;
}

export type SessionType = 'TALK' | 'WORKSHOP' | 'PANEL' | 'BREAK' | 'NETWORKING';

export interface Session {
	id: string;
	eventId: string; // To link this session to a specific event
	title: string;
	date: string; // e.g., "2026-03-12"
	startTime: string; // e.g., "10:00"
	endTime: string; // e.g., "11:30"
	type: SessionType;
	location: string;
	speaker?: Speaker;
	description?: string;
}

export interface AgendaDay {
	id: number;
	date: string;   // e.g., "2026-03-12"
	label: string;  // e.g., "March 12"
}

export interface AgendaStats {
	totalSessions: number;
	daysCount: number;
}
