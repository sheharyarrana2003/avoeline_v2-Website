import { redirect } from "next/navigation";

/**
 * `/vendor/<id>` had no page at all, so it 404'd — while the organizer side has
 * had this exact redirect the whole time. Same reasoning as there: nothing links
 * to the bare path, but people paste and shorten URLs by hand, and a 404 on a URL
 * that looks like it should work reads as the app being broken.
 */
export default async function VendorIndexPage({
    params,
}: {
    params: Promise<{ vendor_id: string }>;
}) {
    const { vendor_id } = await params;
    redirect(`/vendor/${vendor_id}/dashboard`);
}
