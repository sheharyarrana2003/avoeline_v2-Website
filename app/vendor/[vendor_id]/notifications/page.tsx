import { redirect } from "next/navigation";
import { NotificationsView } from "@/src/features/notifications/NotificationsView";
import { resolveNotificationRecipient } from "@/src/features/notifications/recipient";

export default async function VendorNotificationsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const { tab } = await searchParams;

    // The vendor_id in the path is not used to fetch: the recipient comes from the
    // session, so the URL can't be edited to read someone else's notifications.
    const me = await resolveNotificationRecipient();
    if (!me) {
        redirect("/auth/signup");
    }

    return <NotificationsView userId={me.ownerId} tab={tab} />;
}
