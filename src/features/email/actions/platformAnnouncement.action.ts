"use server";

import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { sendPlatformAnnouncementEmail } from "@/src/features/email/platformMail.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";

/**
 * SaaS/admin system announcement to one or more addresses (notifications lane).
 */
export const sendPlatformAnnouncementAction = safeAction({
  input: z.object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(50)]),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    actionUrl: z.string().url().optional(),
  }),
  run: async (input) => {
    const admin = await AuthService.requireAdmin("tenants");
    if (!admin || !admin.isOwner) {
      return safeFail("FORBIDDEN", "Only the SaaS owner can send platform announcements.");
    }
    const limited = rateLimit(`email:announce:${admin.userId}`, 10, 600);
    if (!limited.ok) {
      return safeFail("RATE_LIMIT", `Too many announcements. Retry in ${limited.retryAfterSec}s.`);
    }
    const result = await sendPlatformAnnouncementEmail(input);
    if (!result.ok) return safeFail("SEND_FAILED", result.error || "Could not send announcement.");
    return safeOk({ id: result.id });
  },
});
