import { OrganizerHeader } from "@/src/shared_components/organizer/OrganizerHeader";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerService } from "@/src/services/organizer.service";
import { OrganizerFooter } from "@/src/shared_components/organizer/OrganizerFooter";
import { redirect } from "next/navigation";

export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {

    const u = await AuthService.getCurrentUser();
    if (u === null) {
        redirect("/auth/signup");
    }

    // Request-cached read (deduped with the profile page); used for the header avatar.
    const organizer = await OrganizerService.getOrganizerById(u.userId);

    return (
        <>
            <OrganizerHeader user={u} logoUrl={organizer.organization.logo || undefined} />
            <section>{children}</section>
            <br />
            <br />
            <OrganizerFooter></OrganizerFooter>
        </>
    )

}