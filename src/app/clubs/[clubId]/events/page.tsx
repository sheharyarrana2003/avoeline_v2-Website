import { redirect } from "next/navigation";
import MyEventsPage from "@/src/app/organizer/[organizer_id]/events/page";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";

export default async function ClubEventsPage({
    params,
    searchParams,
}: {
    params: Promise<{ clubId: string }>;
    searchParams: Promise<{ status?: string; q?: string; kind?: string }>;
}) {
    const { clubId } = await params;
    const { club, user } = await requireClubPresident(clubId);
    const modules = await listClubModules(club.id);
    if (!modules.includes("events_dashboard")) redirect(`/clubs/${club.id}`);

    return (
        <MyEventsPage
            params={Promise.resolve({ organizer_id: user.userId })}
            searchParams={searchParams}
        />
    );
}
