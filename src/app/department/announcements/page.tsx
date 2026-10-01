import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";
import { postOrgAnnouncement } from "@/src/features/department/actions/departmentOrg.action";
import { listClubOverviews, resolveDepartment } from "@/src/features/department/department.service";

export const metadata = { title: "Announcements — Department — Avoeline" };

export default async function DepartmentAnnouncementsPage({
    searchParams,
}: {
    searchParams: Promise<{ orgId?: string; e?: string; ok?: string }>;
}) {
    const sp = await searchParams;
    const { department } = await resolveDepartment(sp.orgId);
    const clubs = await listClubOverviews(department.id);

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader title="Announcements" description="Post to a club. The president is notified. You do not edit the club from here." />
            <FormFeedback error={sp.e} success={sp.ok} />
            {clubs.length === 0 ? (
                <p className="text-sm text-ink-soft">Add a club first.</p>
            ) : (
                <form action={postOrgAnnouncement} className="space-y-3 rounded-xl border border-line bg-paper p-5">
                    <input type="hidden" name="returnTo" value="/department/announcements" />
                    <Select name="orgId" label="Club" options={clubs.map((c) => ({ value: c.id, label: c.name }))} />
                    <Input name="title" label="Title" required />
                    <Input name="body" label="Body" required />
                    <SubmitButton className={buttonClass()}>Post</SubmitButton>
                </form>
            )}
        </div>
    );
}
