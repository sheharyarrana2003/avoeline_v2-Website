"use server";

import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { revalidatePath } from "next/cache";

/**
 * Persist an organizer's uploaded logo URL to `organization.logo`.
 * Organizer docs are keyed by the auth uid, which is the organizer_id used in routes.
 */
export async function updateOrganizerLogo(
  organizerId: string,
  logoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!organizerId) return { success: false, error: "Missing organizer id." };

    await adminDb
      .collection(COLLECTIONS.ORGANIZERS)
      .doc(organizerId)
      .update({ "organization.logo": logoUrl });

    revalidatePath(`/organizer/${organizerId}/profile`);
    return { success: true };
  } catch (err: any) {
    console.error("[updateOrganizerLogo]", err);
    return { success: false, error: err?.message ?? "Failed to update logo." };
  }
}
