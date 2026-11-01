import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listPendingSubscriptionPayments } from "@/src/features/onboarding/onboarding.service";
import { TABLES } from "@/data/collections";
import { getSignedUrlsByPath, PAYMENT_SCREENSHOTS_BUCKET, supabaseAdmin } from "@/data/supabase";
import { PendingPaymentsClient } from "./PendingPaymentsClient";

export default async function AdminPendingBillingPage() {
  const admin = await requireAdminArea("tenants");
  if (!admin) redirect("/admin/signin?next=/admin/billing/pending");
  if (!admin.isOwner) redirect("/admin/tenants");

  const payments = await listPendingSubscriptionPayments();
  const payerIds = [...new Set(payments.map((p) => String(p.payer_id || "")).filter(Boolean))];
  const paths = payments.map((p) => String(p.screenshot_url || "")).filter(Boolean);

  const [usersResult, signed] = await Promise.all([
    payerIds.length
      ? supabaseAdmin
          .from(TABLES.USERS)
          .select("id, email, full_name, user_type, pending_plan_key")
          .in("id", payerIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            email: string | null;
            full_name: string | null;
            user_type: string | null;
            pending_plan_key: string | null;
          }[],
        }),
    getSignedUrlsByPath(PAYMENT_SCREENSHOTS_BUCKET, paths),
  ]);

  const userMap = new Map((usersResult.data ?? []).map((u) => [u.id, u]));

  const rows = payments.map((p) => {
    const u = userMap.get(String(p.payer_id));
    return {
      id: p.id,
      email: u?.email || "—",
      name: u?.full_name || "—",
      role: u?.user_type || "—",
      planKey: u?.pending_plan_key || "—",
      amount: Number(p.total_amount ?? 0),
      currency: p.currency || "PKR",
      screenshotUrl: p.screenshot_url ? signed.get(String(p.screenshot_url)) || null : null,
      createdAt: p.created_at,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin/tenants" className="text-xs text-ink-soft hover:text-ink">
        ← Tenants
      </Link>
      <h1 className="mt-2 font-display text-2xl text-ink">Pending subscription payments</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Approve to activate the plan and email the tenant. Reject to ask them to re-upload.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/admin/settings/billing" className="underline">
          Edit bank details
        </Link>
      </p>
      <PendingPaymentsClient rows={rows} />
    </div>
  );
}
