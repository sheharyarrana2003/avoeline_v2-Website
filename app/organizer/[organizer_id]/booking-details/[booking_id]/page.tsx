export default async function EventDetailsPage({ params }: { params: Promise<{ organizer_id : string,booking_id: string }> }) {
    const { organizer_id,booking_id } = await params;
    return (

        <div>
            <h1>Organizer Id {organizer_id}</h1>
            <h1>Bookign Id {booking_id}</h1>
        </div>
    );
}

