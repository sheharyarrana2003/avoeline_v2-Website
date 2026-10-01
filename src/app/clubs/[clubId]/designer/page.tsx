import { redirect } from "next/navigation";
import AiDesignerPage from "@/src/app/organizer/[organizer_id]/designer/page";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";

export const metadata = { title: "AI Designer — Club — Avoeline" };

export default async function ClubDesignerPage({ params }: { params: Promise<{ clubId: string }> }) {
    const { clubId } = await params;
    const { club, user } = await requireClubPresident(clubId);
    const modules = await listClubModules(club.id);
    if (!modules.includes("ai_designer")) redirect(`/clubs/${club.id}`);
    return AiDesignerPage({ params: Promise.resolve({ organizer_id: user.userId }) });
}
