"use server";

import { applyGallerySeedAction } from "./template.action";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { isRedirectError } from "next/dist/client/components/redirect-error";

/**
 * Legacy FormData binder for DesignPicker — maps design id → gallery seed.
 */
export async function applyCertificateDesign(
  eventId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const design = String(formData.get("design") ?? "");
    const result = await applyGallerySeedAction({ eventId, seedId: design });
    if (!result.ok) return fail(result.error.message);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[applyCertificateDesign]", err);
    return fail("Could not apply that design. Please try again.");
  }
}
