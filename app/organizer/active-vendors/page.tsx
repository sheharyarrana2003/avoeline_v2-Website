
import Link from "next/link"
export default function Active_Vendors(){
    return (
        <>
            <div style={{background:'#e8ffe8', color:'#0a600a', padding:'12px', border:'2px solid #0a600a', fontSize:'18px', fontWeight:'700', textAlign:'center'}}>SCREEN: Active Vendors — URL: /organizer/active-vendors</div>
            <h1>Active Vendors</h1>

            <Link href="/organizer/vendor-marketplace">Go to market place</Link>
            
        </>
    )
}