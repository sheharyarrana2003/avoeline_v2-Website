import { redirect } from "next/navigation";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";

export const metadata = { title: "Create hackathon — Club — Avoeline" };

export default async function ClubCreateHackathonPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { club, user } = await requireClubPresident(clubId);
  const modules = await listClubModules(club.id);
  if (!modules.includes("hackathon_ops")) redirect(`/clubs/${club.id}`);
  redirect(`/organizer/${user.userId}/events/create?hackathon=1`);
}
