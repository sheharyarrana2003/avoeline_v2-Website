import { redirect } from "next/navigation";
import { NotificationsView } from "@/src/features/notifications/NotificationsView";
import { resolveNotificationRecipient } from "@/src/features/notifications/recipient";
import { AuthService } from "@/src/features/auth/authService";
import { isSupportViewer } from "@/src/features/admin/supportPreview";

export default async function OrganizerNotificationsPage({
    params,
    searchParams,
}: {
    params: Promise<{ organizer_id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { organizer_id } = await params;
    const { tab } = await searchParams;

    const me = await resolveNotificationRecipient();
    if (!me) {
        redirect("/auth/signin");
    }

    // The id in the path is never used to fetch — the recipient comes from the
    // session, so the URL cannot be edited to read someone else's notifications.
    // Send anyone who lands on a foreign id to their own page rather than quietly
    // showing their notifications under somebody else's URL.
    if (organizer_id !== me.ownerId) {
        const session = await AuthService.getCurrentUser();
        if (isSupportViewer(session)) {
            return <NotificationsView userId={organizer_id} tab={tab} />;
        }
        redirect(`${me.basePath}/notifications`);
    }

    return <NotificationsView userId={me.ownerId} tab={tab} />;
}
