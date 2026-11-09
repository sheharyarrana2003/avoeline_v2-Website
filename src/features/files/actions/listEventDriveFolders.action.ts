"use server";

import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { assertMayUseConnection } from "@/src/features/connections/server/assertConnectionsAccess";
import { getAccessTokenForConnection } from "@/src/features/connections/server/connections.service";
import { listDriveConnectionsForUser } from "@/src/features/connections/server/linkedFiles.service";
import { assertEventActor } from "@/src/features/events/ownership";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk, type SafeActionResult } from "@/src/lib/safeAction";
import { listEventDriveFolders } from "../folders";

const inputSchema = z.object({
  eventId: z.string().uuid(),
  connectionId: z.string().uuid().optional(),
});

export type EventDriveFoldersResult =
  | { connected: false; folders: [] }
  | {
      connected: true;
      connectionId: string;
      folders: Array<{
        kind: string;
        name: string;
        folderId: string;
        webViewLink: string | null;
      }>;
    };

export const listEventDriveFoldersAction = safeAction<typeof inputSchema, EventDriveFoldersResult>({
  input: inputSchema,
  run: async (input): Promise<SafeActionResult<EventDriveFoldersResult>> => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");

    const limited = rateLimit(`drive:event-folders:${user.userId}`, 30, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");

    const may = await assertEventActor(input.eventId, "files");
    if (!may) return safeFail("FORBIDDEN", "You cannot manage files for that event.");

    const drive = await listDriveConnectionsForUser(user.userId);
    if (!drive.length) {
      const data: EventDriveFoldersResult = { connected: false, folders: [] };
      return safeOk(data);
    }

    const connectionId = input.connectionId || drive[0]!.id;
    const mayConn = await assertMayUseConnection({
      userId: user.userId,
      connectionId,
      capability: "drive.files",
    });
    if (!mayConn.ok) return safeFail("FORBIDDEN", mayConn.error);

    try {
      const token = await getAccessTokenForConnection(connectionId);
      const { folders } = await listEventDriveFolders({
        connectionId,
        accessToken: token,
        eventId: input.eventId,
      });
      const data: EventDriveFoldersResult = {
        connected: true,
        connectionId,
        folders: folders.map((f) => ({
          kind: f.kind,
          name: f.name,
          folderId: f.folderId,
          webViewLink: f.webViewLink,
        })),
      };
      return safeOk(data);
    } catch (e) {
      return safeFail("DRIVE", e instanceof Error ? e.message : "Could not list Drive folders.");
    }
  },
});
