export const EXTERNAL_VENDOR_STATUSES = ["planned", "confirmed", "paid", "cancelled"] as const;
export type ExternalVendorStatus = (typeof EXTERNAL_VENDOR_STATUSES)[number];

export type EventExternalVendor = {
  id: string;
  eventId: string;
  name: string;
  vendorType: string;
  description: string;
  budget: number | null;
  contact: string;
  status: ExternalVendorStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function isExternalVendorStatus(v: string): v is ExternalVendorStatus {
  return (EXTERNAL_VENDOR_STATUSES as readonly string[]).includes(v);
}
