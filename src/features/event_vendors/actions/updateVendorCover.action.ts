"use server";

import {
  EventVendorService,
  patchVendorProfile,
} from "@/src/features/event_vendors/event_venders.services";
import { requireSelfOrAdmin } from "@/src/lib/assertSession";
import {
  isServerActionRequest,
  isSupportPreviewPath,
  isSupportViewer,
} from "@/src/features/admin/supportPreview";
import { AuthService } from "@/src/features/auth/authService";
import { revalidatePath } from "next/cache";

export async function updateVendorCover(
  vendorId: string,
  coverUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const gate = await requireSelfOrAdmin(vendorId);
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

    const vendor = await EventVendorService.getVendorById(vendorId);
    if (!vendor) return { success: false, error: "Vendor not found." };

    const docId = vendor.userId || vendorId;
    if (gate.userId !== docId && !gate.isAdmin) {
      return { success: false, error: "You cannot change that vendor." };
    }

    const portfolio = { ...(vendor.portfolio || {}), coverImage: coverUrl };
    await patchVendorProfile(docId, { cover_image_url: coverUrl, portfolio }, { portfolio });

    revalidatePath(`/vendor/${vendorId}/profile`);
    return { success: true };
  } catch (err: unknown) {
    console.error("[updateVendorCover]", err instanceof Error ? err.message : err);
    return { success: false, error: "Failed to update cover." };
  }
}
