import { AuthService } from "@/src/features/auth/authService";
import { redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { ProfileCard } from "@/src/features/networking/components/ProfileCard";
import { listDirectory, listMeetups } from "@/src/features/networking/badges.service";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) redirect("/auth/signin?next=/network");
  const { role } = await searchParams;
  const [people, meetups] = await Promise.all([listDirectory(role), listMeetups()]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <PageHeader title="Networking" description="Find attendees, organizers, and vendors by what they do." />
      <form className="flex max-w-sm flex-col gap-3">
        <Select
          name="role"
          label="Filter by role"
          defaultValue={role || ""}
          options={[
            { value: "", label: "All" },
            { value: "attendee", label: "Attendees" },
            { value: "organizer", label: "Organizers" },
            { value: "vendor", label: "Vendors" },
          ]}
        />
        <Button type="submit" variant="secondary" size="sm">
          Apply filter
        </Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        {people.map((p) => (
          <ProfileCard key={p.id} name={p.name} role={p.role} tags={p.tags} />
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-xl">Badge meetups</h2>
        {meetups.length === 0 ? <p className="text-sm text-ink-soft">No scheduled meetups yet.</p> : null}
        {meetups.map((m) => (
          <Card key={m.id}>
            <CardBody>
              <h3 className="font-medium">{m.title}</h3>
              <p className="text-sm text-ink-soft">{m.description}</p>
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}
