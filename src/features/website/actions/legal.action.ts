"use server";

import { z } from "zod";
import { requireWebsiteCap } from "@/src/features/admin/guard";
import { logModeration } from "@/src/features/admin/actions/moderation";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { publishLegalVersion } from "../legalCms.service";

export const publishLegalVersionAction = safeAction({
  input: z.object({
    documentId: z.string().uuid(),
    bodyMd: z.string().max(200_000),
    changeSummary: z.string().trim().min(1).max(500),
    effectiveDate: z.string().trim().min(8).max(32),
    notifyTenants: z.boolean().default(false),
  }),
  auth: () => requireWebsiteCap("legal:publish"),
  async run(input, admin) {
    const result = await publishLegalVersion({
      documentId: input.documentId,
      bodyMd: input.bodyMd,
      changeSummary: input.changeSummary,
      effectiveDate: input.effectiveDate,
      adminId: admin.userId,
      notifyTenants: input.notifyTenants,
    });
    if (!result.ok) return safeFail("PUBLISH_FAILED", result.error);

    await logModeration({
      admin,
      targetType: "website",
      targetId: input.documentId,
      targetLabel: `legal v${result.version}`,
      action: "published",
      reason: "Published legal document version",
      extra: {
        versionId: result.versionId,
        version: result.version,
        notifySent: result.notify.sent,
        notifySkipped: result.notify.skipped,
        notifyCapped: result.notify.capped,
      },
    });

    return safeOk(result);
  },
});
