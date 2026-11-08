import type { AgendaSessionType } from "@/src/features/agendas/agendaTypes";

export interface Speaker {
  id: string;
  name: string;
  avatarUrl: string;
  role?: string;
  company?: string;
}

/** @deprecated Prefer AgendaSessionType — kept as alias for UI Session.type */
export type SessionType = AgendaSessionType;

export interface Session {
  id: string;
  eventId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: AgendaSessionType;
  location: string;
  room?: string;
  speakers: Speaker[];
  /** @deprecated use speakers[0] */
  speaker?: Speaker;
  description?: string;
  trackId?: string | null;
  trackName?: string | null;
  tiers?: string[];
  speakerIds?: string[];
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
