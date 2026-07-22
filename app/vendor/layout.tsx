import { AuthService } from "@/src/features/auth/authService";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
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

    // Request-cached read (deduped with the profile page); used for the header avatar.
    const vendor = await EventVendorService.getVendorById(u.roleId);

    return (
        <>
            <VendorHeader user={u} logoUrl={vendor?.logo || undefined} />
            <section>{children}</section>
        </>
    )

}