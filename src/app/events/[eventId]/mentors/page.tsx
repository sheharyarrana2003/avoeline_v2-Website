import { redirect } from "next/navigation";

/** Phase B: mentor sign-up removed. */
export default async function MentorsRedirectPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/tracks`);
}
