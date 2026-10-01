import { redirect } from "next/navigation";
import VendorMarketplace from "@/src/app/organizer/[organizer_id]/vendor-marketplace/page";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";

export const metadata = { title: "Marketplace — Club — Avoeline" };

export default async function ClubMarketplacePage({
    params,
    searchParams,
}: {
    params: Promise<{ clubId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { clubId } = await params;
    const { club, user } = await requireClubPresident(clubId);
    const modules = await listClubModules(club.id);
    if (!modules.includes("vendor_store")) redirect(`/clubs/${club.id}`);

    return VendorMarketplace({
        params: Promise.resolve({ organizer_id: user.userId }),
        searchParams,
        listingPath: `/clubs/${club.id}/marketplace`,
    });
}
