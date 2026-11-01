import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminArea } from "@/src/features/admin/guard";
import { parseAdminEventFilters } from "@/src/features/admin/eventModeration.filters";
import { getAdminEventsBundle } from "@/src/features/admin/eventModeration.service";
import { AdminEventsPageClient } from "@/src/features/admin/components/events/AdminEventsPageClient";

export const metadata: Metadata = {
  title: "Events · Admin",
};

/**
 * Platform admin events board — All / Flagged / Moderation log.
 * Thin route: auth + URL filters + bundle fetch; UI is client.
 */
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminArea("events");
  if (!admin) redirect("/admin/signin?next=/admin/events");

  const sp = await searchParams;
  const filters = parseAdminEventFilters(sp);
  const bundle = await getAdminEventsBundle(filters, admin);

  return <AdminEventsPageClient bundle={bundle} />;
}
