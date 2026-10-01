import { notFound, redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

/**
 * Signed-in shortcut to the ticket-scoped task board. The ticket link is the
 * participant credential, so this only resolves the caller's own registration.
 */
export default async function ParticipantTasksRedirect({
  params,
}: {
  params: Promise<{ eventId: string; trackId: string }>;
}) {
  const { eventId, trackId } = await params;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/auth/signin?next=/events/${eventId}/tracks/${trackId}/tasks`);

  const { data: reg } = await supabaseAdmin
    .from(TABLES.REGISTRATIONS)
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.userId)
    .not("status", "in", "(cancelled,rejected)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!reg) notFound();

  redirect(`/events/${eventId}/ticket/${reg.id}/tracks/${trackId}/tasks`);
}
