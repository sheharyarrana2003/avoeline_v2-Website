"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function AttendeeInput() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const params = new URLSearchParams(searchParams.toString());
         if(e.target.value === "" ||e.target.value === undefined ){
             params.delete("value");
         }else{
                        params.set("value",e.target.value);

         }
         
        console.log(params);
        router.push(`${pathname}?${params.toString()}`)
    }


    return (
        <>

            <input type="text" onChange={handleOnChange}  placeholder="search attendee by name ..." />
        </>
    )
}