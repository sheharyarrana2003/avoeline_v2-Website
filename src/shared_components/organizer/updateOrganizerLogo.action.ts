"use server";

import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { requireSelfOrAdmin } from "@/src/lib/assertSession";
import {
  isServerActionRequest,
  isSupportPreviewPath,
  isSupportViewer,
} from "@/src/features/admin/supportPreview";
import { AuthService } from "@/src/features/auth/authService";
import { revalidatePath } from "next/cache";

/**
 * Persist an organizer's uploaded logo URL to the linked organization.
 * Organizer profiles are keyed by the auth uid (route organizer_id).
 */
export async function updateOrganizerLogo(
  organizerId: string,
  logoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!organizerId) return { success: false, error: "Missing organizer id." };
    const gate = await requireSelfOrAdmin(organizerId);
    if (!gate.ok) return { success: false, error: gate.error };
    const me = await AuthService.getCurrentUser();
    if (
      me &&
      isSupportViewer(me) &&
      (await isServerActionRequest()) &&
      (await isSupportPreviewPath(me.userId))
    ) {
      return { success: false, error: "Support preview is read-only." };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("user_id, org_id, extra")
      .eq("user_id", organizerId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return { success: false, error: "Organizer profile not found." };

    if (profile.org_id) {
      const { error: orgError } = await supabaseAdmin
        .from(TABLES.ORGANIZATIONS)
        .update({ logo_url: logoUrl })
        .eq("id", profile.org_id);
      if (orgError) throw orgError;
    }

    const extra = (
      profile.extra && typeof profile.extra === "object" ? profile.extra : {}
    ) as Record<string, unknown>;
    const organization = (
      extra.organization && typeof extra.organization === "object" ? extra.organization : {}
    ) as Record<string, unknown>;
    const { error: extraError } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .update({
        extra: { ...extra, organization: { ...organization, logo: logoUrl } },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", organizerId);
    if (extraError) throw extraError;

    revalidatePath(`/organizer/${organizerId}/profile`);
    return { success: true };
  } catch (err: unknown) {
    console.error("[updateOrganizerLogo]", err instanceof Error ? err.message : err);
    return { success: false, error: "Failed to update logo." };
  }
}
