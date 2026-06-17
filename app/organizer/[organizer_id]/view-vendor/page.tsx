
import Link from "next/link"
export default async function IndividualVendorPage({params} : {params:Promise<{vendor_id:string}>}){
    const resolved_params = await params;
    return (
        <>
            <h1>A specific vendor with the id {resolved_params.vendor_id}</h1>  
        </>
    )
}