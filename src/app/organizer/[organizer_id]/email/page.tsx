import { redirect } from "next/navigation";

/** Legacy path — Connections C1 moved settings to /settings/connections. */
export default async function OrganizerEmailSettingsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizer_id } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") q.set(key, value);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/organizer/${organizer_id}/settings/connections${suffix}`);
}
