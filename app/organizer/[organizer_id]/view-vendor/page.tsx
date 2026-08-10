import { redirect } from "next/navigation";

/**
 * A vendor profile only exists at `view-vendor/<vendor_id>`. Hitting the
 * segment on its own means no vendor was chosen, so send the organizer to the
 * marketplace to pick one.
 */
export default async function ViewVendorIndexPage({
    params,
}: {
    params: Promise<{ organizer_id: string }>;
}) {
    const { organizer_id } = await params;
    redirect(`/organizer/${organizer_id}/vendor-marketplace`);
}
