import { AuthService } from "@/src/features/auth/authService";

/**
 * Who the signed-in user is, for notification purposes: the id their
 * notifications are addressed to, plus their role's route root.
 *
 * The two roles are keyed differently (see authService.ts) — an organizer's
 * route id is the auth uid, a vendor's is the `vendorId` field off their doc,
 * which can carry a "V_" prefix. Notifications are addressed with whichever of
 * those the source document already stores (`booking.organizerId` /
 * `booking.vendorId`), so resolving the id the same way here is what makes reads
 * and writes agree.
 *
 * Derived from the session rather than a route param on purpose: the notification
 * routes take an id in the path, but trusting it would let any signed-in user read
 * another user's notifications by editing the URL.
 *
 * Returns null when nobody is signed in.
 */
export async function resolveNotificationRecipient() {
    const user = await AuthService.getCurrentUser();
    if (!user) return null;

    const isVendor = String(user.userType).trim().toLowerCase() === "vendor";
    const ownerId = isVendor ? user.roleId : user.userId;
    if (!ownerId) return null;

    return {
        ownerId,
        basePath: isVendor ? `/vendor/${user.roleId}` : `/organizer/${user.userId}`,
    };
}
