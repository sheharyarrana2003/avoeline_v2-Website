import { redirect } from "next/navigation";

export default async function HackathonCreateRedirect({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;
  redirect(`/organizer/${organizer_id}/events/create?hackathon=1`);
}
