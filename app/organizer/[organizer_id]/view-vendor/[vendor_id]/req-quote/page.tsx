
import Link from "next/link"
export default async function Req_Quote({params} : {params:Promise<{vendor_id:string}>}){
    const resolved_params = await params;
    return (
        <>
            <h1>Requesting quote for the  id {resolved_params.vendor_id}</h1>  
        </>
    )
}