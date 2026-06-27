import { AuthService } from "@/src/features/auth/authService";
import { VendorHeader } from "@/src/shared_components/vendor/VendorHeader";
export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {


    const u = await AuthService.getCurrentVendor();
    return (
        <>
            <VendorHeader user={u} />
            <section>{children}</section>
        </>
    )

}