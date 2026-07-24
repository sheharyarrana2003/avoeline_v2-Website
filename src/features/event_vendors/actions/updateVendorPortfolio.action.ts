"use server";

import { adminDb } from "@/data/admin_db";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { PortfolioImage, ClientTestimonial, VendorPortfolio } from "@/src/services/models/vendor.model";
import { formatDate } from "@/src/lib/datetime";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

// Read-modify-write the whole `portfolio` map on the vendor doc, mirroring
// updateVendorCover. Reading via getVendorById returns the normalized portfolio
// (all arrays present + coverImage), so the write preserves every field.
async function mutatePortfolio(
    vendorId: string,
    mutate: (portfolio: VendorPortfolio) => void
): Promise<ActionResult> {
    try {
        if (!vendorId) return { success: false, error: "Missing vendor id." };
        const vendor = await EventVendorService.getVendorById(vendorId);
        if (!vendor) return { success: false, error: "Vendor not found." };

        // Vendor docs are keyed by the auth uid (== vendor.userId), not vendorId.
        const docId = vendor.userId || vendorId;
        const portfolio: VendorPortfolio = vendor.portfolio;
        mutate(portfolio);

        await adminDb.collection("vendor").doc(docId).update({ portfolio });
        revalidatePath(`/vendor/${vendorId}/profile`);
        return { success: true };
    } catch (err: any) {
        console.error("[updateVendorPortfolio]", err);
        return { success: false, error: err?.message ?? "Failed to update portfolio." };
    }
}

// ── Images ──────────────────────────────────────────────────────────────────
export async function addPortfolioImage(
    vendorId: string,
    image: { url: string; caption?: string; eventType?: string; date?: string }
): Promise<ActionResult> {
    if (!image?.url) return { success: false, error: "Missing image url." };
    const entry: PortfolioImage = {
        url: image.url,
        caption: image.caption?.trim() || "",
        eventType: image.eventType?.trim() || "",
        date: image.date ? formatDate(image.date) : "",
    };
    return mutatePortfolio(vendorId, (p) => { p.images.push(entry); });
}

export async function removePortfolioImage(vendorId: string, url: string): Promise<ActionResult> {
    return mutatePortfolio(vendorId, (p) => { p.images = p.images.filter((i) => i.url !== url); });
}

// ── Videos ──────────────────────────────────────────────────────────────────
export async function addPortfolioVideo(vendorId: string, url: string): Promise<ActionResult> {
    if (!url) return { success: false, error: "Missing video url." };
    return mutatePortfolio(vendorId, (p) => { if (!p.videos.includes(url)) p.videos.push(url); });
}

export async function removePortfolioVideo(vendorId: string, url: string): Promise<ActionResult> {
    return mutatePortfolio(vendorId, (p) => { p.videos = p.videos.filter((v) => v !== url); });
}

// ── Client testimonials ───────────────────────────────────────────────────────
export async function addClientTestimonial(
    vendorId: string,
    review: { clientName?: string; testimonial?: string; rating?: number; eventDate?: string }
): Promise<ActionResult> {
    if (!review?.testimonial?.trim()) return { success: false, error: "Testimonial text is required." };
    const entry: ClientTestimonial = {
        clientName: review.clientName?.trim() || "Anonymous",
        testimonial: review.testimonial.trim(),
        rating: Math.min(5, Math.max(0, Number(review.rating) || 0)),
        eventDate: review.eventDate ? formatDate(review.eventDate) : "",
    };
    return mutatePortfolio(vendorId, (p) => { p.clientTestimonials.push(entry); });
}

export async function removeClientTestimonial(vendorId: string, index: number): Promise<ActionResult> {
    return mutatePortfolio(vendorId, (p) => {
        if (index >= 0 && index < p.clientTestimonials.length) p.clientTestimonials.splice(index, 1);
    });
}

// ── Past events ───────────────────────────────────────────────────────────────
export async function addPastEvent(vendorId: string, eventId: string): Promise<ActionResult> {
    if (!eventId) return { success: false, error: "Missing event id." };
    return mutatePortfolio(vendorId, (p) => { if (!p.pastEvents.includes(eventId)) p.pastEvents.push(eventId); });
}

export async function removePastEvent(vendorId: string, eventId: string): Promise<ActionResult> {
    return mutatePortfolio(vendorId, (p) => { p.pastEvents = p.pastEvents.filter((e) => e !== eventId); });
}
