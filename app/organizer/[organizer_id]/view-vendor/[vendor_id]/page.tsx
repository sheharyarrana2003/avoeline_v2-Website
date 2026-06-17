
import Link from "next/link"
export default async function Vendor_Marketplace({params} : {params:Promise<{vendor_id:string}>}){
    const resolved_params = await params;
    return (
        <>
            <h1>Req quote {resolved_params.vendor_id}</h1>  
        </>
    )
}