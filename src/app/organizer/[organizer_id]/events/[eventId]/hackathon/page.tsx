import { redirect } from "next/navigation";
import { hackathonDashPath } from "@/src/features/hackathon/kinds";

export default async function LegacyHackathonHubRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams: Promise<{ edit?: string; e?: string; ok?: string; tab?: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const q = await searchParams;
  const tab = q.tab || "tracks";
  const dest =
    tab === "scoreboard" ? "scoreboard" : tab === "tracks" || !q.tab ? "competitions" : "tasks";
  const qs = new URLSearchParams();
  if (q.e) qs.set("e", q.e);
  if (q.ok) qs.set("ok", q.ok);
  if (q.edit) qs.set("edit", q.edit);
  if (dest === "tasks" && q.tab) qs.set("tab", q.tab);
  const suffix = qs.toString() ? `?${qs}` : "";
  redirect(`${hackathonDashPath(organizer_id, eventId, dest)}${suffix}`);
}
