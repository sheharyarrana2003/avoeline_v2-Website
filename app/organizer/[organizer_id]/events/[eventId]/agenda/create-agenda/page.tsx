import { AuthService } from "@/src/features/auth/authService"
import CreateAgendaForm from "@/src/features/agendas/components/CreateAgendaForm"


// export default function AddSessionModal() {
//     const [formData, setFormData] = useState({
//         title: '',
//         speaker: '',
//         date: '2024-06-15',
//         startTime: '10:00',
//         endTime: '11:30',
//         location: 'Main Hall A',
//         sessionType: 'Talk',
//         description: '',
//     });
//
//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };
//
// }



export default async function createAgenda({ params }: { params: Promise<{ id: string }> }) {
    const u = await AuthService.getCurrentUser();
    const { id } = await params;

    console.log("This is id from create agenda ->", id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto">

            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                <CreateAgendaForm />

            </div>
        </div>
    )
}
