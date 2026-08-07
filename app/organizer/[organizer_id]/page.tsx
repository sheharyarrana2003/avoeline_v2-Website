import { redirect } from "next/navigation";

/**
 * `/organizer/<id>` is not a screen of its own -- every entry point links
 * straight to one of the tabs. Send it to the dashboard rather than 404ing a
 * URL people paste and shorten by hand.
 */
export default async function OrganizerIndexPage({
    params,
}: {
    params: Promise<{ organizer_id: string }>;
}) {
    const { organizer_id } = await params;
    redirect(`/organizer/${organizer_id}/dashboard`);
}
