"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertEventActor } from "@/src/features/events/ownership";
import { rateLimit } from "@/src/lib/rateLimit";
import { AuthService } from "@/src/features/auth/authService";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import {
  commitAttendeeImport,
  dryRunAttendeeImport,
  importFieldOptions,
  parseUploadBuffer,
  readGoogleSheetTable,
} from "./attendeeImport.service";
import { guessColumnMap, type ImportColumnKey } from "./attendeeImport.logic";

const columnMapSchema = z.array(
  z.union([
    z.literal("email"),
    z.literal("name"),
    z.literal("phone"),
    z.literal("tier"),
    z.literal("skip"),
    z.string().regex(/^custom:[a-zA-Z0-9_\-]+$/),
  ]),
);

export const getAttendeeImportOptionsAction = safeAction({
  input: z.object({ eventId: z.string().uuid() }),
  run: async ({ eventId }) => {
    const event = await assertEventActor(eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot import attendees for that event.");
    const options = await importFieldOptions(eventId);
    return safeOk({ options });
  },
});

export const parseAttendeeImportFileAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    filename: z.string().min(1).max(200),
    /** Base64 of file bytes (xlsx/csv). Cap ~2MB decoded. */
    base64: z.string().min(1).max(3_000_000),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot import attendees for that event.");
    const limited = rateLimit(`attendee-import:parse:${user.userId}`, 20, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many uploads.");
    const buf = Buffer.from(input.base64, "base64");
    if (buf.length > 2_000_000) return safeFail("VALIDATION", "File too large (max 2MB).");
    const table = await parseUploadBuffer(buf, input.filename);
    if (!table.headers.length) return safeFail("VALIDATION", "No header row found.");
    return safeOk({
      headers: table.headers,
      rowCount: table.rows.length,
      sampleRows: table.rows.slice(0, 5),
      guessedMap: guessColumnMap(table.headers),
      table,
    });
  },
});

export const parseAttendeeImportSheetAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    connectionId: z.string().uuid(),
    spreadsheetId: z.string().min(1).max(200),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot import attendees for that event.");
    const limited = rateLimit(`attendee-import:sheet:${user.userId}`, 10, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many sheet reads.");
    try {
      const table = await readGoogleSheetTable({
        actorId: user.userId,
        connectionId: input.connectionId,
        spreadsheetId: input.spreadsheetId,
      });
      if (!table.headers.length) return safeFail("VALIDATION", "Sheet is empty.");
      return safeOk({
        headers: table.headers,
        rowCount: table.rows.length,
        sampleRows: table.rows.slice(0, 5),
        guessedMap: guessColumnMap(table.headers),
        table,
      });
    } catch (err) {
      return safeFail(
        "BAD_REQUEST",
        err instanceof Error ? err.message : "Could not read that Google Sheet.",
      );
    }
  },
});

export const dryRunAttendeeImportAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    columnMap: columnMapSchema,
    table: z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }),
  }),
  run: async (input) => {
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot import attendees for that event.");
    const result = await dryRunAttendeeImport({
      eventId: input.eventId,
      table: input.table,
      columnMap: input.columnMap as ImportColumnKey[],
    });
    return safeOk(result);
  },
});

export const commitAttendeeImportAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    columnMap: columnMapSchema,
    table: z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    }),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const event = await assertEventActor(input.eventId, "attendees");
    if (!event) return safeFail("FORBIDDEN", "You cannot import attendees for that event.");
    const limited = rateLimit(`attendee-import:commit:${user.userId}`, 5, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many imports.");
    const result = await commitAttendeeImport({
      eventId: input.eventId,
      table: input.table,
      columnMap: input.columnMap as ImportColumnKey[],
    });
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/attendees`);
    revalidatePath(`/organizer/${event.organizerId}/events/${input.eventId}/exports`);
    return safeOk(result);
  },
});
