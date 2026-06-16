import { mockSessions } from "@/app/mockdata/agenda.mock";
import { Session, AgendaDay, AgendaStats } from "@/src/services/models/agenda.model";

/**
  Convert date to March 12 format
 */
function formatDateLabel(dateStr: string): string {
	const date = new Date(dateStr + "T00:00:00");
	return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export const AgendaService = {
	/**
	 * Get all sessions for a specific event.
	 */
	async getSessionsByEventId(eventId: string): Promise<Session[]> {
		return mockSessions.filter((s) => s.eventId === eventId);
	},

	/**
	 * Get sessions for a specific event filtered by date.
	 */
	async getSessionsByEventAndDate(eventId: string, date: string): Promise<Session[]> {
		return mockSessions.filter(
			(s) => s.eventId === eventId && s.date === date
		);
	},

	/**
	 * Derive the list of agenda days from session data for a given event.
	 * Days are sorted chronologically and assigned incremental IDs.
	 */
	async getAgendaDays(eventId: string): Promise<AgendaDay[]> {
		const sessions = mockSessions.filter((s) => s.eventId === eventId);

		const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort();

		return uniqueDates.map((date, index) => ({
			id: index + 1,
			date,
			label: formatDateLabel(date),
		}));
	},

	/**
	 * Compute agenda stats for a given event.
	 */
	async getAgendaStats(eventId: string): Promise<AgendaStats> {
		const sessions = mockSessions.filter((s) => s.eventId === eventId);
		const uniqueDates = new Set(sessions.map((s) => s.date));

		return {
			totalSessions: sessions.length,
			daysCount: uniqueDates.size,
		};
	},

	/**
	 * Group all sessions for an event by date.
	 * Returns a record keyed by date string.
	 */
	async getSessionsGroupedByDate(eventId: string): Promise<Record<string, Session[]>> {
		const sessions = mockSessions.filter((s) => s.eventId === eventId);

		const grouped: Record<string, Session[]> = {};
		for (const session of sessions) {
			if (!grouped[session.date]) {
				grouped[session.date] = [];
			}
			grouped[session.date].push(session);
		}

		return grouped;
	},
};
