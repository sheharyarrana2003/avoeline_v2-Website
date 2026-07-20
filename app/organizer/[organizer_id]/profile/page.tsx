// app/organizer/[id]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

import OrganizerProfileClient from './OrganizerProfileClient';
import { OrganizerService } from '@/src/services/organizer.service';
import { EventService } from '@/src/services/event.service';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const org = await OrganizerService.getOrganizerById(id);
  
  if (!org) {
    return { title: 'Organizer Not Found' };
  }

  return {
    title: `${org.organization.name} - Organizer Profile`,
    description: org.organization.description,
  };
}

export default async function OrganizerPage({ params }: PageProps) {
  const { id } = await params;
  
  const [org, events] = await Promise.all([
    OrganizerService.getOrganizerById(id),
    EventService.getAllEventsByOrganizer(id),
  ]);

  if (!org) {
    notFound();
  }

  return <OrganizerProfileClient organizer={org} events={events} />;
}