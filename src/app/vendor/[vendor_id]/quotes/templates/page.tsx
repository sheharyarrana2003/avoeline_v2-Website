import Link from "next/link";
import { hasVendorModuleAccess } from "@/src/features/permissions/permissions.service";
import { QuotationTemplatesBoard } from "@/src/features/vendor_quotes/components/QuotationTemplatesBoard";
import { listTemplates } from "@/src/features/vendor_quotes/quotationTemplates.service";
import { buttonClass } from "@/src/lib/ui";

export default async function VendorQuoteTemplatesPage({
  params,
}: {
  params: Promise<{ vendor_id: string }>;
}) {
  const { vendor_id } = await params;

  const allowed = await hasVendorModuleAccess(vendor_id, "vendor_quotes");
  if (!allowed) {
    const { LockedModulePanel } =
      await import("@/src/features/permissions/components/LockedModulePanel");
    return <LockedModulePanel moduleKey="vendor_quotes" />;
  }

  const templates = await listTemplates(vendor_id);

  return (
    <>
      <div className="border-b border-line px-4 pt-4 sm:px-6 lg:px-8">
        <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("ghost", "sm")}>
          ← Back to quotes
        </Link>
      </div>
      <QuotationTemplatesBoard vendorId={vendor_id} initialTemplates={templates} />
    </>
  );
}
