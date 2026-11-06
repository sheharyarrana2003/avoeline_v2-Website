"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import {
  createAndLinkFile,
  linkPickedFile,
  listDriveConnectionsForUser,
  listLinkedFiles,
  unlinkFile,
  verifyLinkedFile,
} from "@/src/features/connections/server/linkedFiles.service";
import { assertLinkedFileEntityAccess } from "@/src/features/connections/server/linkedFileEntityAuth";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

const entityType = z.enum(["event", "team", "club", "booking"]);

export const listMyDriveConnectionsAction = safeAction({
  input: z.object({}),
  run: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const connections = await listDriveConnectionsForUser(user.userId);
    return safeOk({ connections });
  },
});

export const listLinkedFilesAction = safeAction({
  input: z.object({
    ownerType: z.enum(["user", "org"]),
    ownerId: z.string().uuid(),
    entityType: entityType.optional(),
    entityId: z.string().min(1).max(200).optional(),
    q: z.string().max(200).optional(),
    mimeContains: z.string().max(80).optional(),
    addedBy: z.string().uuid().optional(),
    status: z.enum(["ok", "missing", "no_access"]).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const limited = rateLimit(`drive:list:${user.userId}`, 40, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    if (input.ownerType === "user" && input.ownerId !== user.userId) {
      return safeFail("FORBIDDEN", "You can only list your own library.");
    }
    if (input.entityType && input.entityId) {
      const may = await assertLinkedFileEntityAccess({
        actorId: user.userId,
        entityType: input.entityType,
        entityId: input.entityId,
      });
      if (!may.ok) return safeFail("FORBIDDEN", may.error);
    } else if (input.ownerType === "org") {
      const may = await assertLinkedFileEntityAccess({
        actorId: user.userId,
        entityType: "club",
        entityId: input.ownerId,
      });
      if (!may.ok) return safeFail("FORBIDDEN", may.error);
    }
    const result = await listLinkedFiles(input);
    return safeOk(result);
  },
});

export const linkPickedFileAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    entityType,
    entityId: z.string().min(1).max(200),
    providerFileId: z.string().min(1).max(200),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const limited = rateLimit(`drive:link:${user.userId}`, 20, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    const may = await assertLinkedFileEntityAccess({
      actorId: user.userId,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    if (!may.ok) return safeFail("FORBIDDEN", may.error);
    const r = await linkPickedFile({ actorId: user.userId, ...input });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    revalidatePath("/");
    return safeOk({ file: r.file });
  },
});

export const createDriveFileAction = safeAction({
  input: z.object({
    connectionId: z.string().uuid(),
    entityType,
    entityId: z.string().min(1).max(200),
    kind: z.enum(["doc", "sheet", "slides"]),
    title: z.string().min(1).max(200),
  }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const limited = rateLimit(`drive:create:${user.userId}`, 15, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    const may = await assertLinkedFileEntityAccess({
      actorId: user.userId,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    if (!may.ok) return safeFail("FORBIDDEN", may.error);
    const r = await createAndLinkFile({ actorId: user.userId, ...input });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    return safeOk({ file: r.file });
  },
});

export const unlinkFileAction = safeAction({
  input: z.object({ linkedFileId: z.string().uuid() }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const limited = rateLimit(`drive:unlink:${user.userId}`, 30, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many requests.");
    const r = await unlinkFile({ actorId: user.userId, linkedFileId: input.linkedFileId });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    return safeOk({ unlinked: true });
  },
});

export const verifyLinkedFileAction = safeAction({
  input: z.object({ linkedFileId: z.string().uuid() }),
  run: async (input) => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("FORBIDDEN", "Sign in required.");
    const r = await verifyLinkedFile({ actorId: user.userId, linkedFileId: input.linkedFileId });
    if (!r.ok) return safeFail("BAD_REQUEST", r.error);
    return safeOk({ status: r.status });
  },
});
