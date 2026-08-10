import { Speaker } from "@/src/services/models/event.model";


// export interface Speaker {
//   speakerId: string;
//   name: string;
//   designation: string;
//   bio: string;
//   profileImage: string;
//   sessionTitle: string;
//   purpose: string;
//   start_time: string;
//   end_time: string;
// }
export function SpeakerCard({ speaker }: { speaker: Speaker }) {
    return (
        <div className="flex flex-col items-center p-8 bg-white border border-gray-100 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">

            <div className="relative w-28 h-28 mb-5 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-50/50 flex items-center justify-center">
                {speaker.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={speaker.profileImage}
                        alt={speaker.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover grayscale"
                    />
                ) : (
                    <span className="text-2xl font-bold text-gray-400">
                        {speaker.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                )}
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-1">
                {speaker.name}
            </h3>

            <p className="text-sm font-medium text-gray-500 mb-6 text-center">
                {speaker.designation} 
            </p>
             <p className="text-sm font-medium text-gray-500 mb-6 text-center">
                {speaker.purpose} 
            </p>
             <p className="text-sm font-medium text-gray-500 mb-6 text-center">
                {speaker.start_time} 
            </p>
             <p className="text-sm font-medium text-gray-500 mb-6 text-center">
                {speaker.end_time} 
            </p>

            <div className="px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
                <span className="text-[13px] font-bold text-gray-700">
                    {speaker.sessionTitle}
                </span>
            </div>
            
        </div>
    );
}