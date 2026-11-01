import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MessageSquareWarning } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import StarRating from "@/src/shared_components/ui/StarRating";
import { VideoPreview } from "@/src/shared_components/ui/VideoPreview";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { formatDateMedium } from "@/src/lib/datetime";
import { requireAdminArea } from "@/src/features/admin/guard";
import { canManageArea } from "@/src/features/admin/types";
import { listVendorReviews, listVendors, moderationFor } from "@/src/features/admin/admin.service";
import { ModerationForm, QuickAction } from "@/src/features/admin/components/ModerationForm";
import { setVendorStatus } from "@/src/features/admin/actions/vendors.action";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { AdminDeleteForm, AdminEditNameForm } from "@/src/features/admin/components/AdminCrudForms";
import {
  deleteVendorAccount,
  updateVendorAccount,
} from "@/src/features/admin/actions/tenancy.action";

export default async function AdminVendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const admin = await requireAdminArea("vendors");
  if (!admin) redirect("/admin/signin?next=/admin/vendors");
  const canManage = canManageArea(admin, "vendors");

  const [{ vendorId }, { e, ok }] = await Promise.all([params, searchParams]);
  const [vendors, allReviews] = await Promise.all([listVendors(), listVendorReviews()]);
  const vendor = vendors.find((v) => v.vendorId === vendorId);
  if (!vendor) notFound();

  const reviews = allReviews.filter((r) => r.vendorId === vendor.vendorId);
  const log = await moderationFor(vendor.vendorId);
  const complaints = reviews.filter((r) => r.rating > 0 && r.rating <= 2);
  const images = vendor.portfolio.filter((p) => p.kind === "image");
  const videos = vendor.portfolio.filter((p) => p.kind === "video");

  return (
    <>
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All vendors
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">{vendor.businessName}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {vendor.email || "no email on file"}
            {vendor.phone ? ` · ${vendor.phone}` : ""}
            {vendor.serviceCategories.length ? ` · ${vendor.serviceCategories.join(", ")}` : ""}
          </p>
          {vendor.address ? <p className="mt-1 text-xs text-ink-soft">{vendor.address}</p> : null}
        </div>
        <StatusBadge status={vendor.status} />
      </div>
      <FormFeedback error={e} success={ok} />

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
          label="Bookings"
          value={`${vendor.completedBookings}`}
          sublabel={`${vendor.totalBookings} total · ${vendor.isVerified ? "verified" : "unverified"}`}
        />
        <MetricTile
          label="Joined"
          value={vendor.createdAt ? formatDateMedium(vendor.createdAt) : "—"}
        />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Card title="Pricing packages">
            <CardBody>
              {vendor.pricingPackages.length === 0 ? (
                <p className="text-sm text-ink-soft">No packages on file.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {vendor.pricingPackages.map((pkg, i) => (
                    <li key={`${pkg.name}-${i}`} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-sm font-medium text-ink">
                        {pkg.name}
                        {pkg.price ? <span className="ml-2 text-ink-soft">{pkg.price}</span> : null}
                      </p>
                      {pkg.description ? (
                        <p className="mt-0.5 text-sm text-ink-soft">{pkg.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card title="Portfolio">
            <CardBody>
              {vendor.portfolio.length === 0 ? (
                <p className="text-sm text-ink-soft">No portfolio media yet.</p>
              ) : (
                <div className="space-y-4">
                  {images.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((img) => (
                        <ImageLightbox key={img.url} src={img.url} alt="" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt=""
                            className="h-28 w-full rounded-lg object-cover bg-muted"
                          />
                        </ImageLightbox>
                      ))}
                    </div>
                  ) : null}
                  {videos.map((vid) => (
                    <VideoPreview
                      key={vid.url}
                      src={vid.url}
                      title="Portfolio video"
                      className="w-full"
                    >
                      <video src={vid.url} controls className="max-w-full rounded-xl bg-muted" />
                    </VideoPreview>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card title="Testimonials & reviews">
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
        </div>

        <div className="space-y-8">
          <Card title="Edit vendor">
            <CardBody>
              {canManage ? (
                <AdminEditNameForm
                  action={updateVendorAccount}
                  hidden={{
                    vendorId: vendor.vendorId,
                    returnTo: `/admin/vendors/${vendor.vendorId}`,
                  }}
                  name={vendor.businessName}
                  nameLabel="Business name"
                />
              ) : (
                <p className="text-sm text-ink-soft">View-only access.</p>
              )}
              {admin.isOwner ? (
                <div className="mt-4 border-t border-line pt-4">
                  <AdminDeleteForm
                    action={deleteVendorAccount}
                    hidden={{ vendorId: vendor.vendorId }}
                    label="Delete vendor"
                    title={`Delete ${vendor.businessName}?`}
                    description="Removes the vendor profile and their Supabase Auth login."
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>

          {canManage ? (
            <Card title="Status actions">
              <CardBody>
                <div className="space-y-6">
                  {vendor.status === "pending" ? (
                    <>
                      <div>
                        <p className="pb-2 text-sm text-ink-soft">
                          Approving puts them in the organizer marketplace.
                        </p>
                        <QuickAction
                          action={setVendorStatus}
                          hidden={{ vendorDocId: vendor.vendorId, status: "approved" }}
                          label="Approve vendor"
                          className="inline-flex h-8 items-center rounded-lg border border-ink bg-ink px-3 text-xs font-semibold text-ink-invert hover:bg-ink-soft"
                        />
                      </div>
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
                    </>
                  ) : null}

                  {vendor.status === "approved" ? (
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

                  {vendor.status === "suspended" || vendor.status === "rejected" ? (
                    <div>
                      <p className="pb-2 text-sm text-ink-soft">
                        Reinstate returns them to the marketplace as approved. Use a reason so the
                        moderation log shows why access was restored.
                      </p>
                      <ModerationForm
                        action={setVendorStatus}
                        hidden={{
                          vendorDocId: vendor.vendorId,
                          status: "approved",
                          requireReason: "1",
                        }}
                        reasonLabel="Reason for reinstating"
                        reasonPlaceholder="Issue resolved after review."
                        confirmTitle={`Reinstate ${vendor.businessName}?`}
                        confirmDescription="They become approved and visible to organizers again."
                        confirmLabel="Reinstate"
                        submitLabel="Reinstate"
                        successMessage="Reinstated."
                        tone="default"
                      />
                    </div>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ) : null}

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
