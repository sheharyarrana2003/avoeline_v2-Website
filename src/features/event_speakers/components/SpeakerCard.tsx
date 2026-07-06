import { Speaker } from "@/src/services/models/event.model";
import Image from "next/image";



export function SpeakerCard({ speaker }: { speaker: Speaker }) {
    return (
        <div className="flex flex-col items-center p-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
            
            <div className="relative w-28 h-28 mb-5 rounded-full overflow-hidden bg-slate-100 border-4 border-slate-50/50">
                {/* <Image 
                    src={speaker.profileImage} 
                    alt={speaker.name}
                   width={112} 
        height={112}
                    className="object-cover grayscale" 
                    sizes="(max-width: 768px) 100vw, 112px"
                /> */}
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">
                {speaker.name}
            </h3>

            <p className="text-sm font-medium text-slate-500 mb-6 text-center">
                {speaker.designation} 
            </p>

            <div className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                <span className="text-[13px] font-bold text-slate-700">
                    {speaker.sessionTitle}
                </span>
            </div>
            
        </div>
    );
}