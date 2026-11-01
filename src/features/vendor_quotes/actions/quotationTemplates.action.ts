"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSelfOrAdmin } from "@/src/lib/assertSession";
import { hasVendorModuleAccess } from "@/src/features/permissions/permissions.service";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import {
  deleteTemplate,
  listTemplates,
  saveTemplate,
  setDefaultTemplate,
} from "../quotationTemplates.service";

async function gateVendor(vendorId: string) {
  const gate = await requireSelfOrAdmin(vendorId);
  if (!gate.ok) return safeFail("FORBIDDEN", gate.error) as never;
  const allowed = await hasVendorModuleAccess(vendorId, "vendor_quotes");
  if (!allowed) {
    return safeFail("MODULE", "Quotes module is not enabled for this vendor.") as never;
  }
  return { vendorId, userId: gate.userId };
}

function revalidateTemplates(vendorId: string) {
  revalidatePath(`/vendor/${vendorId}/quotes`);
  revalidatePath(`/vendor/${vendorId}/quotes/templates`);
  revalidatePath(`/vendor/${vendorId}/quotes/prep-quote`, "layout");
}

export const listQuotationTemplatesAction = safeAction({
  input: z.object({ vendorId: z.string().uuid() }),
  run: async (input) => {
    await gateVendor(input.vendorId);
    const rows = await listTemplates(input.vendorId);
    return safeOk(rows);
  },
});

export const saveQuotationTemplateAction = safeAction({
  input: z.object({
    vendorId: z.string().uuid(),
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    bodyHtml: z.string().max(50_000),
    isDefault: z.boolean().optional(),
  }),
  run: async (input) => {
    await gateVendor(input.vendorId);
    const row = await saveTemplate({
      id: input.id,
      vendorId: input.vendorId,
      name: input.name,
      bodyHtml: input.bodyHtml,
      isDefault: input.isDefault,
    });
    revalidateTemplates(input.vendorId);
    return safeOk(row);
  },
});

export const deleteQuotationTemplateAction = safeAction({
  input: z.object({
    vendorId: z.string().uuid(),
    templateId: z.string().uuid(),
  }),
  run: async (input) => {
    await gateVendor(input.vendorId);
    await deleteTemplate(input.vendorId, input.templateId);
    revalidateTemplates(input.vendorId);
    return safeOk(undefined);
  },
});

export const setDefaultQuotationTemplateAction = safeAction({
  input: z.object({
    vendorId: z.string().uuid(),
    templateId: z.string().uuid(),
  }),
  run: async (input) => {
    await gateVendor(input.vendorId);
    const row = await setDefaultTemplate(input.vendorId, input.templateId);
    revalidateTemplates(input.vendorId);
    return safeOk(row);
  },
});
