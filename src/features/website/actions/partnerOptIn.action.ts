"use server";

import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerService } from "@/src/services/organizer.service";
import { safeAction, safeFail, safeOk, type SafeActionResult } from "@/src/lib/safeAction";
import {
  getPartnerByOrganizer,
  organizerPartnerOptIn,
  organizerPartnerRevoke,
} from "../partnersCms.service";

async function requireSignedIn(): Promise<{ userId: string } | SafeActionResult<never>> {
  const user = await AuthService.getCurrentUser();
  if (!user?.userId) return safeFail("UNAUTHORIZED", "Please sign in.");
  return { userId: user.userId };
}

export const setOrganizerPartnerOptInAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
    enabled: z.boolean(),
  }),
  auth: () => requireSignedIn(),
  async run(input, auth) {
    if (auth.userId !== input.organizerId) {
      return safeFail("FORBIDDEN", "You can only change your own partner listing.");
    }

    if (!input.enabled) {
      const result = await organizerPartnerRevoke(input.organizerId);
      if (!result.ok) return safeFail("SAVE_FAILED", result.error);
      return safeOk({ enabled: false as boolean, id: null as string | null });
    }

    const organizer = await OrganizerService.getOrganizerById(input.organizerId);
    const name =
      organizer.organization.name?.trim() || organizer.contact.primaryEmail || "Organization";
    const result = await organizerPartnerOptIn({
      organizerId: input.organizerId,
      name,
      url: null,
    });
    if (!result.ok) return safeFail("SAVE_FAILED", result.error);
    return safeOk({ enabled: true as boolean, id: result.id as string | null });
  },
});

export const getOrganizerPartnerStatusAction = safeAction({
  input: z.object({ organizerId: z.string().uuid() }),
  auth: () => requireSignedIn(),
  async run(input, auth) {
    if (auth.userId !== input.organizerId) {
      return safeFail("FORBIDDEN", "You can only view your own partner listing.");
    }
    const row = await getPartnerByOrganizer(input.organizerId);
    return safeOk({
      status: row?.consent_status ?? null,
      visible: row?.visible ?? false,
      id: row?.id ?? null,
    });
  },
});
