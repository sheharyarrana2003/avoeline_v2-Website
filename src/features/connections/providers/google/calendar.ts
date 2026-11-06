import { mapGoogleApiError } from "./errors";

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary: boolean;
};

export type CalendarEventPayload = {
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
  timeZone: string;
  attendeeEmails?: string[];
};

export type GoogleCalendarEventResult = {
  eventId: string;
  etag: string | null;
  meetUrl: string | null;
  hangoutPending: boolean;
  htmlLink: string | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function googleFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    const mapped = mapGoogleApiError(
      res.status,
      await res
        .clone()
        .text()
        .catch(() => ""),
    );
    const wait =
      mapped.kind === "rate_limit" && mapped.retryAfterMs
        ? mapped.retryAfterMs
        : 500 * 2 ** attempt;
    await sleep(wait);
    return googleFetch(accessToken, url, init, attempt + 1);
  }
  return res;
}

function extractMeetUrl(json: Record<string, unknown>): {
  meetUrl: string | null;
  pending: boolean;
} {
  const conf = json.conferenceData as
    | {
        entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
        createRequest?: { status?: { statusCode?: string } };
      }
    | undefined;
  const status = conf?.createRequest?.status?.statusCode?.toLowerCase();
  const pending = status === "pending" || status === "pendingcreate";
  const hangout = conf?.entryPoints?.find((e) => e.entryPointType === "video");
  return { meetUrl: hangout?.uri || null, pending: pending && !hangout?.uri };
}

export const GoogleCalendarClient = {
  async listCalendars(accessToken: string): Promise<GoogleCalendarListItem[]> {
    const res = await googleFetch(
      accessToken,
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    const json = JSON.parse(text) as {
      items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
    };
    return (json.items || [])
      .filter((i) => i.id)
      .map((i) => ({
        id: i.id!,
        summary: i.summary || i.id!,
        primary: Boolean(i.primary),
      }));
  },

  async createEvent(
    accessToken: string,
    opts: {
      calendarId: string;
      payload: CalendarEventPayload;
      withMeet: boolean;
      requestId: string;
      sendUpdates: "none" | "all";
    },
  ): Promise<GoogleCalendarEventResult> {
    const body: Record<string, unknown> = {
      summary: opts.payload.summary,
      description: opts.payload.description || undefined,
      location: opts.payload.location || undefined,
      start: { dateTime: opts.payload.startIso, timeZone: opts.payload.timeZone },
      end: { dateTime: opts.payload.endIso, timeZone: opts.payload.timeZone },
    };
    if (opts.payload.attendeeEmails?.length) {
      body.attendees = opts.payload.attendeeEmails.map((email) => ({ email }));
    }
    if (opts.withMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: opts.requestId.slice(0, 64),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }
    const q = new URLSearchParams({
      sendUpdates: opts.sendUpdates,
      conferenceDataVersion: opts.withMeet ? "1" : "0",
    });
    const calId = encodeURIComponent(opts.calendarId);
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${q}`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    const json = JSON.parse(text) as Record<string, unknown>;
    const meet = extractMeetUrl(json);
    return {
      eventId: String(json.id || ""),
      etag: json.etag ? String(json.etag) : null,
      meetUrl: meet.meetUrl,
      hangoutPending: meet.pending,
      htmlLink: json.htmlLink ? String(json.htmlLink) : null,
    };
  },

  async updateEvent(
    accessToken: string,
    opts: {
      calendarId: string;
      eventId: string;
      payload: CalendarEventPayload;
      withMeet: boolean;
      requestId: string;
      sendUpdates: "none" | "all";
      existingMeet?: boolean;
    },
  ): Promise<GoogleCalendarEventResult> {
    const body: Record<string, unknown> = {
      summary: opts.payload.summary,
      description: opts.payload.description || undefined,
      location: opts.payload.location || undefined,
      start: { dateTime: opts.payload.startIso, timeZone: opts.payload.timeZone },
      end: { dateTime: opts.payload.endIso, timeZone: opts.payload.timeZone },
    };
    if (opts.payload.attendeeEmails?.length) {
      body.attendees = opts.payload.attendeeEmails.map((email) => ({ email }));
    }
    if (opts.withMeet && !opts.existingMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: opts.requestId.slice(0, 64),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }
    const q = new URLSearchParams({
      sendUpdates: opts.sendUpdates,
      conferenceDataVersion: opts.withMeet ? "1" : "0",
    });
    const calId = encodeURIComponent(opts.calendarId);
    const evId = encodeURIComponent(opts.eventId);
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evId}?${q}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    const json = JSON.parse(text) as Record<string, unknown>;
    const meet = extractMeetUrl(json);
    return {
      eventId: String(json.id || opts.eventId),
      etag: json.etag ? String(json.etag) : null,
      meetUrl: meet.meetUrl,
      hangoutPending: meet.pending,
      htmlLink: json.htmlLink ? String(json.htmlLink) : null,
    };
  },

  async getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<GoogleCalendarEventResult> {
    const calId = encodeURIComponent(calendarId);
    const evId = encodeURIComponent(eventId);
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evId}`,
    );
    const text = await res.text();
    if (!res.ok) {
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
    const json = JSON.parse(text) as Record<string, unknown>;
    const meet = extractMeetUrl(json);
    return {
      eventId: String(json.id || eventId),
      etag: json.etag ? String(json.etag) : null,
      meetUrl: meet.meetUrl,
      hangoutPending: meet.pending,
      htmlLink: json.htmlLink ? String(json.htmlLink) : null,
    };
  },

  async deleteEvent(
    accessToken: string,
    opts: { calendarId: string; eventId: string; sendUpdates: "none" | "all" },
  ): Promise<void> {
    const q = new URLSearchParams({ sendUpdates: opts.sendUpdates });
    const calId = encodeURIComponent(opts.calendarId);
    const evId = encodeURIComponent(opts.eventId);
    const res = await googleFetch(
      accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evId}?${q}`,
      { method: "DELETE" },
    );
    if (res.status === 404 || res.status === 410) return;
    if (!res.ok) {
      const text = await res.text();
      const mapped = mapGoogleApiError(res.status, text);
      throw Object.assign(new Error(mapped.message), { mapped });
    }
  },

  /** Poll until Meet URL appears or attempts exhausted. */
  async pollMeetUrl(
    accessToken: string,
    calendarId: string,
    eventId: string,
    attempts = 4,
  ): Promise<string | null> {
    for (let i = 0; i < attempts; i++) {
      const ev = await this.getEvent(accessToken, calendarId, eventId);
      if (ev.meetUrl) return ev.meetUrl;
      if (!ev.hangoutPending) return null;
      await sleep(800 * (i + 1));
    }
    return null;
  },
};
