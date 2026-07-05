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
