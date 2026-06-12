// interface EventsTabProps{
//     arr : string[],
//     default_url : string
// }


// import Link from "next/link"
// export function EventsTab({ currentTab }: { currentTab: string }) {

//     const arr = ["all", "draft", "published", "ongoing", "completed", "cancelled"];
//     const default_url = "/organizer/events";
    
//     return (
//         <><h6>tabs</h6>
//             <div className="flex space-x-6 border-b border-gray-200 mb-6 pb-2">

//                 {arr.map((tab) => {

//                     // 3. If it's "all", go to the base URL. Otherwise, add the ?status parameter.
//                     const targetUrl = tab === "all"
//                         ? default_url
//                         : `${default_url}?status=${tab}`;

//                     return (
//                         <Link
//                             key={tab}
//                             href={targetUrl}
//                             className={`capitalize ${currentTab === tab
//                                     ? "font-bold text-black border-b-2 border-black"
//                                     : "text-gray-500 hover:text-gray-800"
//                                 }`}
//                         >
//                             {tab}
//                         </Link>
//                     );
//                 })}
               
//             </div>
//         </>

//     )
// }