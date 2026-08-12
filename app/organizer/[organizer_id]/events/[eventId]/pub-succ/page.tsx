// app/(organizer)/dashboard/events/publish-success/page.tsx
import SuccessIcon from "@/src/features/events/components/wizard/results/components/SuccessIcon";
import SuccessHeader from "@/src/features/events/components/wizard/results/components/SuccessHeader";
import EventStats from "@/src/features/events/components/wizard/results/components/EventStats";
import ActionButtons from "@/src/features/events/components/wizard/results/components/ActionButtons";
import ShareRow from "@/src/features/events/components/wizard/results/components/ShareRow";
import { EventService } from "@/src/services/event.service";
import { formatDate } from "@/src/lib/datetime";

export default async function PublishSuccessModal({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
  const resolvedParams = await params;
  const organizer_id = resolvedParams.organizer_id;
  const event_id = resolvedParams.eventId;
  const event = await EventService.getEventByID(event_id);
  let message = "";

  if(event && event.status === 'draft'){
    message = ' is a draft event.'
  }else if(event && event.status === 'published'){
    message = 'is now live and open for registrations.'
  }
else{
  message = " is being added to your events";
}
  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 bg-white-900/50 flex items-center justify-center">
      {/* Modal Container */}
      <div className="bg-white rounded-[32px] p-10 max-w-[500px] w-full shadow-2xl relative overflow-hidden">

        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-gray-200 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          <SuccessIcon />


          <SuccessHeader
            eventTitle={event.title}
            message={message}
          />

          <EventStats
            capacity={event.capacity.totalSeats}
            date={formatDate(event.schedule.startDate)}
          />

          <ActionButtons organizer_id={organizer_id} eventId={event.id} />

          <ShareRow
            eventUrl={`https://avoeline.com/events/${event.id}`}
            eventTitle={event.title}
          />
        </div>
      </div>
    </div>
  );
}