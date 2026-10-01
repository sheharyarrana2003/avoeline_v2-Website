import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";
import { reviewOrgRequest } from "@/src/features/clubs/actions/orgRequests.action";
import { listDepartmentRequestQueue } from "@/src/features/clubs/club.service";
import { listClubOverviews, resolveDepartment } from "@/src/features/department/department.service";

export const metadata = { title: "Club requests — Department — Avoeline" };

export default async function DepartmentRequestsPage({
    searchParams,
}: {
    searchParams: Promise<{ orgId?: string; e?: string; ok?: string }>;
}) {
    const sp = await searchParams;
    const { department } = await resolveDepartment(sp.orgId);
    const clubs = await listClubOverviews(department.id);
    const requests = await listDepartmentRequestQueue(clubs.map((c) => c.id));

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader title="Club requests" description="Approve or reject requests from club presidents. Open attachments to review files." />
            <FormFeedback error={sp.e} success={sp.ok} />
            {requests.length === 0 ? <p className="text-sm text-ink-soft">No pending requests.</p> : null}
            {requests.map((r) => (
                <form key={r.id} action={reviewOrgRequest} className="space-y-3 rounded-xl border border-line bg-paper p-4 text-sm">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="returnTo" value="/department/requests" />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="font-medium text-ink">
                                {clubs.find((c) => c.id === r.orgId)?.name ?? "Club"}: {r.title}
                            </p>
                            <p className="text-ink-soft">
                                {r.requestType.replace("_", " ")}
                                {r.requestedAmount != null ? ` · ${r.requestedAmount}` : ""}
                            </p>
                            {r.details ? <p className="mt-1 text-xs text-ink-soft">{r.details}</p> : null}
                            {r.attachmentUrl ? (
                                <a
                                    href={r.attachmentUrl}
                                    download={r.attachmentName || true}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-block text-xs font-medium text-ink hover:underline"
                                >
                                    {r.attachmentName ? `Download ${r.attachmentName}` : "Download attachment"}
                                </a>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            name="reviewNote"
                            placeholder="Note (optional)"
                            aria-label="Review note"
                            className="min-w-48 flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs"
                        />
                        <SubmitButton name="status" value="approved" className={buttonClass("primary", "sm")}>
                            Approve
                        </SubmitButton>
                        <SubmitButton name="status" value="rejected" className={buttonClass("secondary", "sm")}>
                            Reject
                        </SubmitButton>
                    </div>
                </form>
            ))}
        </div>
    );
}
