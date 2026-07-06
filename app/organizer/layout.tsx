import { OrganizerHeader } from "@/src/shared_components/organizer/OrganizerHeader";
import { AuthService } from "@/src/features/auth/authService";
import { OrganizerFooter } from "@/src/shared_components/organizer/OrganizerFooter";

export default async function OrganizerLayout({
    children,
}: {
    children: React.ReactNode
}) {

console.log("LAYOUT HIT")
    const u = await AuthService.getCurrentUser();
    console.log("After auth service LAYOUT ")

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