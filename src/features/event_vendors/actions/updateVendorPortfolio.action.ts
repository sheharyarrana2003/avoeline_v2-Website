"use server";

import {
  EventVendorService,
  patchVendorProfile,
} from "@/src/features/event_vendors/event_venders.services";
import { PortfolioImage, VendorPortfolio } from "@/src/services/models/vendor.model";
import { formatDate } from "@/src/lib/datetime";
import { requireSelfOrAdmin } from "@/src/lib/assertSession";
import {
  isServerActionRequest,
  isSupportPreviewPath,
  isSupportViewer,
} from "@/src/features/admin/supportPreview";
import { AuthService } from "@/src/features/auth/authService";
import { hasVendorModuleAccess } from "@/src/features/permissions/permissions.service";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

async function mutatePortfolio(
  vendorId: string,
  mutate: (portfolio: VendorPortfolio) => void,
  opts?: { requirePortfolioModule?: boolean },
): Promise<ActionResult> {
  try {
    if (!vendorId) return { success: false, error: "Missing vendor id." };
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

    if (opts?.requirePortfolioModule) {
      const allowed = await hasVendorModuleAccess(vendorId, "vendor_portfolio");
      if (!allowed) {
        return {
          success: false,
          error: "Portfolio videos require Vendor Pro (portfolio module).",
        };
      }
    }

    const vendor = await EventVendorService.getVendorById(vendorId);
    if (!vendor) return { success: false, error: "Vendor not found." };

    const docId = vendor.userId || vendorId;
    if (gate.userId !== docId && !gate.isAdmin) {
      return { success: false, error: "You cannot change that vendor." };
    }
    const portfolio: VendorPortfolio = vendor.portfolio;
    mutate(portfolio);

    await patchVendorProfile(docId, { portfolio }, { portfolio });
    revalidatePath(`/vendor/${vendorId}/profile`);
    return { success: true };
  } catch (err: unknown) {
    console.error("[updateVendorPortfolio]", err instanceof Error ? err.message : err);
    return { success: false, error: "Failed to update portfolio." };
  }
}

// ── Images ──────────────────────────────────────────────────────────────────
export async function addPortfolioImage(
  vendorId: string,
  image: { url: string; caption?: string; eventType?: string; date?: string },
): Promise<ActionResult> {
  if (!image?.url) return { success: false, error: "Missing image url." };
  const entry: PortfolioImage = {
    url: image.url,
    caption: image.caption?.trim() || "",
    eventType: image.eventType?.trim() || "",
    date: image.date ? formatDate(image.date) : "",
  };
  return mutatePortfolio(vendorId, (p) => {
    p.images.push(entry);
  });
}

export async function removePortfolioImage(vendorId: string, url: string): Promise<ActionResult> {
  return mutatePortfolio(vendorId, (p) => {
    p.images = p.images.filter((i) => i.url !== url);
  });
}

// ── Videos (vendor_portfolio module required to add) ─────────────────────────
export async function addPortfolioVideo(vendorId: string, url: string): Promise<ActionResult> {
  if (!url) return { success: false, error: "Missing video url." };
  return mutatePortfolio(
    vendorId,
    (p) => {
      if (!p.videos.includes(url)) p.videos.push(url);
    },
    { requirePortfolioModule: true },
  );
}

export async function removePortfolioVideo(vendorId: string, url: string): Promise<ActionResult> {
  return mutatePortfolio(vendorId, (p) => {
    p.videos = p.videos.filter((v) => v !== url);
  });
}

// NOTE: two things here are no longer vendor-authored.
//   - Client testimonials: reviews are written by organizers against a completed
//     booking (src/features/bookings/actions/reviewVendor.action.ts).
//   - Past events: derived from the vendor's completed bookings rather than
//     picked from a dropdown, so the list is a record of delivered work.
// Existing portfolio.clientTestimonials / portfolio.pastEvents values are left in
// place; the testimonials still render read-only.
