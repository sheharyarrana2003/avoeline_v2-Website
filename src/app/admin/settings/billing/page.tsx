import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminArea } from "@/src/features/admin/guard";
import { getPlatformBillingSettings } from "@/src/features/billing/billing.service";
import { BillingSettingsBoard } from "@/src/features/billing/components/BillingSettingsBoard";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { buttonClass } from "@/src/lib/ui";

export default async function AdminBillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const admin = await requireAdminArea("plans");
  if (!admin) redirect("/admin/signin?next=/admin/settings/billing");
  if (!admin.isOwner) redirect("/admin/plans");

  const [{ e, ok }, settings] = await Promise.all([searchParams, getPlatformBillingSettings()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin/plans" className="text-xs text-ink-soft hover:text-ink">
        ← Plans
      </Link>
      <PageHeader
        title="Platform bank details"
        description="Shown on organizer and vendor paid-plan checkout. Edit anytime."
        actions={
          <Link href="/admin/billing/pending" className={buttonClass("secondary", "sm")}>
            Pending payments
          </Link>
        }
      />
      <FormFeedback error={e} success={ok} />
      <BillingSettingsBoard settings={settings} />
    </div>
  );
}
