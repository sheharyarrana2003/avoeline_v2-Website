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
	eventId: string; 
	title: string;
	date: string; 
	startTime: string; 
	endTime: string; 
	type: SessionType;
	location: string;
	speaker?: Speaker;
	description?: string;
	/**
	 * Attendee tiers this session is for. Empty means everyone, which is what
	 * every session written before tiers existed reads as -- so adding the field
	 * hides nothing retroactively.
	 *
	 * Spec 2.1: a tiered event's attendees "see different agenda/seating based on
	 * tier". This is that gate, and it is applied when the agenda is read for an
	 * attendee rather than when it is written.
	 */
	tiers?: string[];
}

export interface AgendaDay {
	id: number;
	date: string;  
	label: string;  
}

export interface AgendaStats {
	totalSessions: number;
	daysCount: number;
}
