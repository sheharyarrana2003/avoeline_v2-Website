import { SpeakerService } from "@/src/features/event_speakers/speakers.service"
import { AuthService } from "@/src/services/authService"
import CreateSpeakerForm from "@/src/features/event_speakers/components/CreateSpeakerForm"

export default async function Create_speaker({ params }: { params: Promise<{ id: string }> }) {
    const u = await AuthService.getCurrentUser();
    const { id } = await params;
    
    console.log("This is id from create speaker ->", id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto">
            
            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                
                <CreateSpeakerForm />
                
            </div>
        </div>
    )
}