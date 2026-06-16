// Re-export all agenda types from the central model for feature-level use.
// This follows the same pattern as event_speakers/types/speaker.ts.
export type {
	Session,
	SessionType,
	Speaker,
	AgendaDay,
	AgendaStats,
} from "@/src/services/models/agenda.model";
