import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";
import { submitOrgRequest } from "@/src/features/clubs/actions/orgRequests.action";
import { listClubRequests, requireClubPresident } from "@/src/features/clubs/club.service";

function statusVariant(status: string) {
    if (status === "approved") return "success" as const;
    if (status === "rejected") return "danger" as const;
    return "warning" as const;
}

export default async function ClubRequestsPage({
    params,
    searchParams,
}: {
    params: Promise<{ clubId: string }>;
    searchParams: Promise<{ e?: string; ok?: string }>;
}) {
    const { clubId } = await params;
    const { e, ok } = await searchParams;
    const { club } = await requireClubPresident(clubId);
    const requests = await listClubRequests(club.id);

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <PageHeader title="Requests" description="Send budget or approval requests to your department. Attach a file when it helps." />
            <FormFeedback error={e} success={ok} />

            <form action={submitOrgRequest} encType="multipart/form-data" className="grid gap-3 rounded-xl border border-line bg-paper p-5 sm:grid-cols-2">
                <input type="hidden" name="orgId" value={club.id} />
                <input type="hidden" name="returnTo" value={`/clubs/${club.id}/requests`} />
                <Select
                    id="req-type"
                    name="requestType"
                    label="Type"
                    options={[
                        { value: "budget", label: "Budget" },
                        { value: "event_approval", label: "Event approval" },
                        { value: "other", label: "Other" },
                    ]}
                />
                <Input id="req-title" name="title" label="Title" required />
                <Input id="req-details" name="details" label="Details" wrapperClassName="sm:col-span-2" />
                <Input id="req-amount" name="requestedAmount" type="number" min={0} label="Amount (budget)" />
                <label className="block text-sm">
                    <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-ink-soft">Attachment</span>
                    <input
                        type="file"
                        name="attachment"
                        className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5"
                    />
                </label>
                <div className="flex items-end sm:col-span-2">
                    <SubmitButton className={buttonClass()}>Submit request</SubmitButton>
                </div>
            </form>

            <ul className="divide-y divide-line text-sm">
                {requests.length === 0 ? <li className="py-3 text-ink-soft">No requests yet.</li> : null}
                {requests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                        <div>
                            <p className="font-medium text-ink">{r.title}</p>
                            <p className="text-ink-soft">
                                {r.requestType.replace("_", " ")}
                                {r.requestedAmount != null ? ` · ${r.requestedAmount}` : ""}
                            </p>
                            {r.details ? <p className="mt-1 text-xs text-ink-soft">{r.details}</p> : null}
                            {r.reviewNote ? <p className="mt-1 text-xs text-ink-soft">Note: {r.reviewNote}</p> : null}
                            {r.attachmentUrl ? (
                                <a href={r.attachmentUrl} download={r.attachmentName || true} className="mt-1 inline-block text-xs font-medium text-ink hover:underline">
                                    {r.attachmentName || "Download file"}
                                </a>
                            ) : null}
                        </div>
                        <Badge size="sm" variant={statusVariant(r.status)}>
                            {r.status}
                        </Badge>
                    </li>
                ))}
            </ul>
        </div>
    );
}
