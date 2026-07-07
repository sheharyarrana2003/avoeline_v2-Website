import CreateAgendaForm from "@/src/features/agendas/components/CreateAgendaForm";

export default async function CreateAgendaPage({
    params,
}: {
    params: Promise<{ eventId: string; organizer_id: string }>;
}) {
    const { eventId, organizer_id } = await params;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl shadow-2xl rounded-2xl drop-shadow-2xl">
                <CreateAgendaForm eventId={eventId} organizerId={organizer_id} />
            </div>
        </div>
    );
}
