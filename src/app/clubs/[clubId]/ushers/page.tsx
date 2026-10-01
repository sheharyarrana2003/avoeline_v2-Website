import { redirect } from "next/navigation";
import UshersPage from "@/src/app/organizer/[organizer_id]/ushers/page";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";

export const metadata = { title: "Ushers — Club — Avoeline" };

export default async function ClubUshersPage({ params }: { params: Promise<{ clubId: string }> }) {
    const { clubId } = await params;
    const { club, user } = await requireClubPresident(clubId);
    const modules = await listClubModules(club.id);
    if (!modules.includes("ushers_ops")) redirect(`/clubs/${club.id}`);
    return UshersPage({ params: Promise.resolve({ organizer_id: user.userId }) });
}
