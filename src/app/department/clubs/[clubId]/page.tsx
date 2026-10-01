import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { setClubModuleAccess } from "@/src/features/department/actions/departmentOrg.action";
import { getDepartmentPlan, listClubModules, moduleOptions, resolveDepartment } from "@/src/features/department/department.service";
import { MODULE_LABELS } from "@/src/features/permissions/moduleKeys";

export default async function DepartmentClubInspectPage({
    params,
    searchParams,
}: {
    params: Promise<{ clubId: string }>;
    searchParams: Promise<{ e?: string; ok?: string }>;
}) {
    const { clubId } = await params;
    const { e, ok } = await searchParams;
    const club = await TeamEngineService.getOrg(clubId);
    if (!club || club.type !== "club" || !club.parentOrgId) notFound();

    const { department } = await resolveDepartment(club.parentOrgId);
    if (club.parentOrgId !== department.id) notFound();

    const [plan, granted, committees, { data: events }, { data: announcements }, { data: requests }] = await Promise.all([
        getDepartmentPlan(department.id),
        listClubModules(club.id),
        TeamEngineService.getTeamsByContext({ contextType: "club_committee", orgId: club.id }),
        supabaseAdmin.from(TABLES.EVENTS).select("id, title").eq("org_id", club.id),
        supabaseAdmin.from(TABLES.ORG_ANNOUNCEMENTS).select("id, title, body, created_at").eq("org_id", club.id).order("created_at", { ascending: false }).limit(8),
        supabaseAdmin.from(TABLES.ORG_REQUESTS).select("id, title, status, request_type, attachment_url, attachment_name").eq("org_id", club.id).order("created_at", { ascending: false }).limit(12),
    ]);
    const options = moduleOptions(plan);
    const grantedSet = new Set(granted);

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <PageHeader
                title={club.name}
                description="Read-only oversight. Grant features from the department plan. Internal club work stays on the president's login."
            />
            <FormFeedback error={e} success={ok} />

            <form action={setClubModuleAccess} className="rounded-xl border border-line bg-paper p-5 space-y-3">
                <input type="hidden" name="departmentId" value={department.id} />
                <input type="hidden" name="orgId" value={club.id} />
                <input type="hidden" name="returnTo" value={`/department/clubs/${club.id}`} />
                <h2 className="font-display text-lg">Features for this club</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((o) => (
                        <label key={o.value} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="modules" value={o.value} defaultChecked={grantedSet.has(o.value)} />
                            {o.label}
                        </label>
                    ))}
                </div>
                <SubmitButton className={buttonClass()}>Save access</SubmitButton>
            </form>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Events (read only)">
                    <CardBody>
                        {(events ?? []).length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : null}
                        <ul className="space-y-2 text-sm">
                            {(events ?? []).map((ev) => (
                                <li key={ev.id}>
                                    <Link href={`/events/${ev.id}`} className="text-ink hover:underline">
                                        {ev.title || "Untitled"}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
                <Card title="Teams (read only)">
                    <CardBody>
                        {committees.length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : null}
                        <ul className="space-y-2 text-sm">
                            {committees.map((t) => (
                                <li key={t.id}>{t.name}</li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
                <Card title="Announcements">
                    <CardBody>
                        {(announcements ?? []).length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : null}
                        <ul className="space-y-3 text-sm">
                            {(announcements ?? []).map((a) => (
                                <li key={a.id}>
                                    <p className="font-medium">{a.title}</p>
                                    <p className="text-ink-soft">{a.body}</p>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
                <Card title="Requests">
                    <CardBody>
                        {(requests ?? []).length === 0 ? <p className="text-sm text-ink-soft">None yet.</p> : null}
                        <ul className="space-y-2 text-sm">
                            {(requests ?? []).map((r) => (
                                <li key={r.id} className="space-y-1">
                                    <p>
                                        {r.title} · {String(r.request_type).replace("_", " ")} · {r.status}
                                    </p>
                                    {r.attachment_url ? (
                                        <a
                                            href={r.attachment_url}
                                            download={r.attachment_name || true}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-medium text-ink hover:underline"
                                        >
                                            {r.attachment_name ? `Download ${r.attachment_name}` : "Download file"}
                                        </a>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                        <Link href="/department/requests" className="mt-3 inline-block text-xs font-medium text-ink hover:underline">
                            Review queue
                        </Link>
                    </CardBody>
                </Card>
            </div>
            <p className="text-xs text-ink-soft">
                Granted: {granted.length ? granted.map((k) => MODULE_LABELS[k]).join(", ") : "none"}
            </p>
        </div>
    );
}
