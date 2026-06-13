"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function SpeakerSearchBar() {
    const router = useRouter();
   const resolveParam = usePathname();
   const searchParams = useSearchParams();
   const input_value = searchParams.get("input_val");

   const handleChange  = (term :string)=>{
    const params = new URLSearchParams(searchParams);
    console.log(params);

    if(term){
        params.set("input_val",term);
    }else{
        params.delete("input_val");
    }
    router.replace(`${resolveParam}?${params.toString()}`)

   }

    return (
        <input className="pd-5 mb-10"
            type="text" 
            placeholder="Search speakers..." 
            onChange={(e)=>{handleChange(e.target.value)}}
            defaultValue={searchParams.get("search")?.toString()}

        />
    );
}