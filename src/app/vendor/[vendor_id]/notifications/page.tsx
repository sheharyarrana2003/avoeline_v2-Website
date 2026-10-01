import { redirect } from "next/navigation";
import { NotificationsView } from "@/src/features/notifications/NotificationsView";
import { resolveNotificationRecipient } from "@/src/features/notifications/recipient";

export default async function VendorNotificationsPage({
    params,
    searchParams,
}: {
    params: Promise<{ vendor_id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { vendor_id } = await params;
    const { tab } = await searchParams;

    const me = await resolveNotificationRecipient();
    if (!me) {
        redirect("/auth/signin");
    }

    // The id in the path is never used to fetch — the recipient comes from the
    // session, so the URL cannot be edited to read someone else's notifications.
    // Send anyone who lands on a foreign id to their own page rather than quietly
    // showing their notifications under somebody else's URL.
    if (vendor_id !== me.ownerId) {
        redirect(`${me.basePath}/notifications`);
    }

    return <NotificationsView userId={me.ownerId} tab={tab} />;
}
