// app/organizer/[id]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

import OrganizerProfileClient from './OrganizerProfileClient';
import { OrganizerService } from '@/src/services/organizer.service';
import { EventService } from '@/src/services/event.service';

interface PageProps {
  params: Promise<{ organizer_id: string }>;
}

// export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
//   const { organizer_id } = await params;
//   const org = await OrganizerService.getOrganizerById(organizer_id);
  
//   if (!org) {
//     return { title: 'Organizer Not Found' };
//   }

//   return {
//     title: `${org.organization.name} - Organizer Profile`,
//     description: org.organization.description,
//   };
// }

export default async function OrganizerPage({ params }: PageProps) {
  const { organizer_id } = await params;
  
 const [orgData, eventsData] = await Promise.all([
    OrganizerService.getOrganizerById(organizer_id),
    EventService.getAllEventsByOrganizer(organizer_id),
  ]);

  if (!orgData) {
    notFound();
  }

  // Deep clone to convert class instances, methods, and Timestamps into plain JSON primitives
  const org = JSON.parse(JSON.stringify(orgData));
  const events = JSON.parse(JSON.stringify(eventsData));

  return (
    <><OrganizerProfileClient organizer={org} events={events} /></>
  );
}