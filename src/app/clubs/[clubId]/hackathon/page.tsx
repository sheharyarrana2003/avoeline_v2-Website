import { redirect } from "next/navigation";
import { listClubModules } from "@/src/features/department/department.service";
import { requireClubPresident } from "@/src/features/clubs/club.service";

export const metadata = { title: "Hackathon — Club — Avoeline" };

export default async function ClubHackathonPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { club } = await requireClubPresident(clubId);
  const modules = await listClubModules(club.id);
  if (!modules.includes("hackathon_ops")) redirect(`/clubs/${club.id}`);
  redirect(`/clubs/${clubId}/events?kind=hackathon`);
}
