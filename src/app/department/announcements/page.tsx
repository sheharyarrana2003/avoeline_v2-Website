import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { resolveDepartment, listClubOverviews } from "@/src/features/department/department.service";
import { listDepartmentAnnouncements } from "@/src/features/department/announcements.service";
import { postDepartmentAnnouncement } from "@/src/features/department/actions/announcements.action";

export const metadata = { title: "Announcements — Department — Avoeline" };

export default async function DepartmentAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; e?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const { department } = await resolveDepartment(sp.orgId);
  const [clubs, announcements] = await Promise.all([
    listClubOverviews(department.id),
    listDepartmentAnnouncements(department.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Announcements"
        description="Compose once; recipients are resolved server-side. Cap 500 per send; rate-limited."
      />
      <FormFeedback error={sp.e} success={sp.ok} />

      <Card title="Compose">
        <CardBody>
          <form action={postDepartmentAnnouncement} className="space-y-4">
            <input type="hidden" name="departmentId" value={department.id} />
            <input type="hidden" name="returnTo" value="/department/announcements" />
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="ann-title">
                Title
              </label>
              <input id="ann-title" name="title" required maxLength={160} className={fieldClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="ann-body">
                Body
              </label>
              <textarea
                id="ann-body"
                name="body"
                required
                rows={5}
                maxLength={8000}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="ann-audience">
                Audience
              </label>
              <select
                id="ann-audience"
                name="audience"
                className={fieldClass}
                defaultValue="presidents_only"
              >
                <option value="all_clubs">All clubs (presidents + members)</option>
                <option value="selected_clubs">Selected clubs (presidents)</option>
                <option value="presidents_only">Presidents only</option>
                <option value="all_members">All club members</option>
              </select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-ink">Clubs (for selected clubs)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {clubs.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="clubIds" value={c.id} />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-ink">Channels</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="channels" value="in_app" defaultChecked />
                In-app notification
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="channels" value="email" />
                Email (Resend)
              </label>
            </fieldset>
            <SubmitButton className={buttonClass()}>Send announcement</SubmitButton>
          </form>
        </CardBody>
      </Card>

      <Card title="Recent sends">
        <CardBody>
          {announcements.length === 0 ? (
            <p className="text-sm text-ink-soft">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className="py-3">
                  <Link
                    href={`/department/announcements/${a.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-1 text-2xs uppercase text-ink-faint">
                    {a.audience || "—"} · {formatDateMedium(a.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
