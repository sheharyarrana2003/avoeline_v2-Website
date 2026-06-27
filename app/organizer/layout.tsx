import { OrganizerHeader } from "@/src/shared_components/organizer/OrganizerHeader";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerFooter } from "@/src/shared_components/organizer/OrganizerFooter";
export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {


    const u = await AuthService.getCurrentUser();
    return(
        <>
        <OrganizerHeader user={u}/>
     


         <section>{children}</section>
                 <br />
        <br />

         
         <OrganizerFooter></OrganizerFooter>
        </>
    )
    
}