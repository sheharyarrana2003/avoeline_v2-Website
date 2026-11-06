"use server";

import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { listConnections } from "@/src/features/connections/server/connections.service";
import { assertMayUseConnection } from "@/src/features/connections/server/assertConnectionsAccess";
import { findOrgConnectionsWithGrant } from "@/src/features/connections/server/grants.service";
import { setDefaultSender } from "@/src/features/connections/server/connections.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

export const listSendableConnectionsAction = safeAction({
  input: z.object({
    eventId: z.string().uuid().optional(),
    orgContext: z.string().uuid().optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");

    const options: Array<{
      connectionId: string;
      label: string;
      source: "personal" | "org" | "event";
    }> = [];
    const seen = new Set<string>();

    if (input.eventId) {
      const { data: pref } = await supabaseAdmin
        .from(TABLES.SENDER_PREFERENCES)
        .select("connection_id")
        .eq("event_id", input.eventId)
        .maybeSingle();
      if (pref?.connection_id) {
        const may = await assertMayUseConnection({
          userId: user.userId,
          connectionId: pref.connection_id,
          capability: "email.send",
        });
        if (may.ok) {
          const personal = await listConnections({
            ownerType: "user",
            ownerId: user.userId,
          });
          const match =
            personal.find((c) => c.id === pref.connection_id) ||
            (await listConnections({
              ownerType: "org",
              ownerId: input.orgContext || "",
            }).then((list) => list.find((c) => c.id === pref.connection_id)));
          if (match) {
            options.push({
              connectionId: match.id,
              label: match.providerEmail,
              source: "event",
            });
            seen.add(match.id);
          }
        }
      }
    }

    const personal = await listConnections({
      ownerType: "user",
      ownerId: user.userId,
      includeQuota: false,
    });
    for (const c of personal) {
      if (c.status !== "active") continue;
      if (!c.capabilities.some((cap) => cap.capability === "email.send" && cap.enabled)) continue;
      if (seen.has(c.id)) continue;
      options.push({
        connectionId: c.id,
        label: c.providerEmail,
        source: "personal",
      });
      seen.add(c.id);
    }

    if (input.orgContext) {
      const grantId = await findOrgConnectionsWithGrant({
        orgId: input.orgContext,
        userId: user.userId,
        capability: "email.send",
      });
      if (grantId && !seen.has(grantId)) {
        const { data: row } = await supabaseAdmin
          .from(TABLES.INTEGRATION_CONNECTIONS)
          .select("id, provider_email, status")
          .eq("id", grantId)
          .maybeSingle();
        if (row?.status === "active") {
          options.push({
            connectionId: row.id,
            label: row.provider_email,
            source: "org",
          });
        }
      }
    }

    return safeOk({ options });
  },
});

export const setEventDefaultSenderAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    connectionId: z.string().uuid(),
    ownerId: z.string().uuid(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const may = await assertMayUseConnection({
      userId: user.userId,
      connectionId: input.connectionId,
      capability: "email.send",
    });
    if (!may.ok) return safeFail("FORBIDDEN", may.error);
    await setDefaultSender({
      ownerType: "user",
      ownerId: input.ownerId,
      connectionId: input.connectionId,
      eventId: input.eventId,
    });
    return safeOk({ saved: true });
  },
});
