import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquareWarning } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import StarRating from "@/src/shared_components/ui/StarRating";
import { formatDateMedium } from "@/src/lib/datetime";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listVendorReviews, listVendors, moderationFor } from "@/src/features/admin/admin.service";
import { ModerationForm, QuickAction } from "@/src/features/admin/components/ModerationForm";
import { setVendorStatus } from "@/src/features/admin/actions/vendors.action";

/**
 * Spec 9.6: "view vendor ratings/complaints submitted by organizers, with a way
 * to suspend a vendor if needed".
 *
 * The complaints ARE the reviews. Organizers leave them after a completed
 * booking, they are the only channel this product gives them, and the lowest
 * ratings sort first — which is what somebody opening this page is looking for.
 * A second complaint entity the spec does not describe would leave two
 * half-used places to check.
 */
export default async function AdminVendorDetailPage({
    params,
}: {
    params: Promise<{ vendorId: string }>;
}) {
    if (!(await requireAdminArea("vendors"))) notFound();

    const { vendorId } = await params;
    const [vendors, allReviews] = await Promise.all([listVendors(), listVendorReviews()]);
    const vendor = vendors.find((v) => v.vendorId === vendorId);
    if (!vendor) notFound();

    const reviews = allReviews.filter((r) => r.vendorId === vendor.vendorId);
    const log = await moderationFor(vendor.vendorId);
    const complaints = reviews.filter((r) => r.rating > 0 && r.rating <= 2);

    return (
        <>
            <Link href="/admin/vendors" className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
                <ChevronLeft className="h-3.5 w-3.5" />
                All vendors
            </Link>

            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl text-ink">{vendor.businessName}</h1>
                    <p className="mt-1 text-sm text-ink-soft">
                        {vendor.email || "no email on file"}
                        {vendor.serviceCategories.length ? ` · ${vendor.serviceCategories.join(", ")}` : ""}
                    </p>
                </div>
                <StatusBadge status={vendor.status} />
            </div>

            <section className="mt-8 grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile
                    label="Rating"
                    value={vendor.totalReviews ? vendor.averageRating.toFixed(1) : "—"}
                    sublabel={`${vendor.totalReviews} review${vendor.totalReviews === 1 ? "" : "s"}`}
                />
                <MetricTile
                    label="Complaints"
                    value={`${complaints.length}`}
                    icon={<MessageSquareWarning className="h-4 w-4" />}
                    sublabel="Reviews of two stars or fewer"
                />
                <MetricTile
                    label="Approval"
                    value={vendor.status}
                    sublabel={vendor.status === "active" ? "In the marketplace" : "Hidden from organizers"}
                />
                <MetricTile
                    label="Joined"
                    value={vendor.createdAt ? formatDateMedium(vendor.createdAt) : "—"}
                />
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <Card title="What organizers said">
                    <CardBody>
                        {reviews.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<MessageSquareWarning className="h-5 w-5" />}
                                title="No reviews yet"
                                description="Organizers can review a vendor once a booking is completed."
                            />
                        ) : (
                            <ul className="divide-y divide-line">
                                {reviews.map((review) => (
                                    <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <StarRating rating={review.rating} size="md" />
                                            <span className="text-2xs uppercase text-ink-faint">
                                                {review.reviewerName}
                                                {review.createdAt ? ` · ${formatDateMedium(review.createdAt)}` : ""}
                                            </span>
                                        </div>
                                        {review.title ? (
                                            <p className="mt-1 text-sm font-medium text-ink">{review.title}</p>
                                        ) : null}
                                        {review.comment ? (
                                            <p className="mt-0.5 text-sm text-ink-soft">{review.comment}</p>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>

                <div className="space-y-8">
                    <Card title="Approval">
                        <CardBody>
                            <div className="space-y-6">
                                {vendor.status !== "active" ? (
                                    <div>
                                        <p className="pb-2 text-sm text-ink-soft">
                                            Approving puts them in the organizer marketplace.
                                        </p>
                                        <QuickAction
                                            action={setVendorStatus}
                                            hidden={{ vendorDocId: vendor.vendorId, status: "active" }}
                                            label="Approve vendor"
                                            className="inline-flex h-8 items-center rounded-lg border border-ink bg-ink px-3 text-xs font-semibold text-ink-invert hover:bg-ink-soft"
                                        />
                                    </div>
                                ) : null}

                                {vendor.status === "pending" ? (
                                    <ModerationForm
                                        action={setVendorStatus}
                                        hidden={{ vendorDocId: vendor.vendorId, status: "rejected" }}
                                        reasonLabel="Why are you rejecting this application?"
                                        reasonPlaceholder="Could not verify the business details provided."
                                        confirmTitle={`Reject ${vendor.businessName}?`}
                                        confirmDescription="They stay off the marketplace and are told why."
                                        confirmLabel="Reject application"
                                        submitLabel="Reject application"
                                        successMessage="Rejected."
                                    />
                                ) : null}

                                {vendor.status === "active" ? (
                                    <ModerationForm
                                        action={setVendorStatus}
                                        hidden={{ vendorDocId: vendor.vendorId, status: "suspended" }}
                                        reasonLabel="Why are you suspending this vendor?"
                                        reasonPlaceholder="Repeated complaints about non-delivery."
                                        confirmTitle={`Suspend ${vendor.businessName}?`}
                                        confirmDescription="They disappear from the marketplace immediately. Existing bookings are not cancelled."
                                        confirmLabel="Suspend vendor"
                                        submitLabel="Suspend vendor"
                                        successMessage="Suspended and hidden from organizers."
                                    />
                                ) : null}
                            </div>
                        </CardBody>
                    </Card>

                    <Card title="Moderation history">
                        <CardBody>
                            {log.length === 0 ? (
                                <p className="text-sm text-ink-soft">Nothing has been decided about this vendor.</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {log.map((entry) => (
                                        <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <StatusBadge status={entry.action} size="sm" />
                                                <span className="text-2xs uppercase text-ink-faint">
                                                    {formatDateMedium(entry.createdAt)}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-ink-soft">{entry.reason}</p>
                                            <p className="text-2xs uppercase text-ink-faint">{entry.adminEmail}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </>
    );
}
