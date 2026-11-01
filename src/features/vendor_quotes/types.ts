/** Client-safe quotation template shapes. */

export type QuotationTemplate = {
  id: string;
  vendorId: string;
  name: string;
  bodyHtml: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Values substituted into {{placeholders}} when applying a template. */
export type QuotationTemplateVars = {
  business_name?: string;
  quote_total?: string;
  event_name?: string;
  organizer_name?: string;
  service_date?: string;
  location?: string;
  guest_count?: string;
  currency?: string;
  validity?: string;
  terms?: string;
};

export const QUOTATION_TEMPLATE_PLACEHOLDERS = [
  "business_name",
  "quote_total",
  "event_name",
  "organizer_name",
  "service_date",
  "location",
  "guest_count",
  "currency",
  "validity",
  "terms",
] as const;
