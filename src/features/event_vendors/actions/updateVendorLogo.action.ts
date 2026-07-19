"use server";

import { adminDb } from "@/data/admin_db";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { revalidatePath } from "next/cache";

export async function updateVendorLogo(
  vendorId: string,
  logoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const vendor = await EventVendorService.getVendorById(vendorId);
    if (!vendor) return { success: false, error: "Vendor not found." };

    // Vendor docs are keyed by the auth uid (== vendor.userId), not the vendorId field.
    const docId = vendor.userId || vendorId;
    await adminDb.collection("vendor").doc(docId).update({ logo: logoUrl });

    revalidatePath(`/vendor/${vendorId}/profile`);
    return { success: true };
  } catch (err: any) {
    console.error("[updateVendorLogo]", err);
    return { success: false, error: err?.message ?? "Failed to update logo." };
  }
}
