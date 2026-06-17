export default async function OrganizerIDPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (

        <div>
            <h1>Default Organizer id page {id}</h1>
        </div>
    );
}

