export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (

        <div>
            <h1>Event Details {id}</h1>
        </div>
    );
}

