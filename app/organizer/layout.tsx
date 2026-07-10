import { OrganizerHeader } from "@/src/shared_components/organizer/OrganizerHeader";
import { AuthService } from "@/src/features/auth/authService";
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

    return (
        <>
            <OrganizerHeader user={u} />
            <section>{children}</section>
            <br />
            <br />
            <OrganizerFooter></OrganizerFooter>
        </>
    )

}