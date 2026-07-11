import { AuthService } from "@/src/features/auth/authService";
import { VendorHeader } from "@/src/shared_components/vendor/VendorHeader";
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
            <VendorHeader user={u} />
            <section>{children}</section>
        </>
    )

}