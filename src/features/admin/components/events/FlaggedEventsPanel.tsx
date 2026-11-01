"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { formatHostLine2 } from "@/src/features/admin/eventModeration.filters";
import type {
  AdminModerationEventRow,
  FlaggedEventRow,
} from "@/src/features/admin/eventModeration.types";
import { ReportReviewDrawer } from "./ReportReviewDrawer";
import { ModerateEventModal, UnpublishUndoToast } from "./ModerateEventModal";

function toModerationRow(f: FlaggedEventRow): AdminModerationEventRow {
  return {
    id: f.eventId,
    title: f.title,
    bannerImage: f.bannerImage,
    categoryId: "",
    categoryLabel: f.categoryLabel,
    format: f.format,
    status: f.status,
    visibility: "public",
    startDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    organizerId: f.organizerId,
    orgId: null,
    totalSeats: null,
    registrationsCount: 0,
    moderationUnpublished: f.moderationUnpublished,
    createdAt: "",
    city: null,
    host: f.host,
    openReportCount: f.reportCount,
    latestReportAt: f.latestReportedAt,
  };
}

export function FlaggedEventsPanel({
  rows,
  nextCursor,
  canModerate,
  isOwner,
}: {
  rows: FlaggedEventRow[];
  nextCursor: string | null;
  canModerate: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [review, setReview] = useState<FlaggedEventRow | null>(null);
  const [moderate, setModerate] = useState<AdminModerationEventRow | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<Flag className="h-5 w-5" />}
          title="No open reports"
          description="When attendees report an event, it will appear here."
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {rows.map((row) => {
        const host2 = formatHostLine2(row.host);
        const reason =
          row.latestReason.length > 120 ? `${row.latestReason.slice(0, 117)}…` : row.latestReason;
        return (
          <article
            key={row.eventId}
            className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <EventThumb
                title={row.title}
                src={row.bannerImage}
                size="wide"
                category={row.categoryLabel}
              />
              <p className="text-sm text-ink-soft">{row.host.organizerName}</p>
              {host2 ? <p className="text-2xs text-ink-faint">{host2}</p> : null}
              <p className="text-sm text-ink">{reason}</p>
              <p className="text-2xs text-ink-faint">
                {row.reportCount} report{row.reportCount === 1 ? "" : "s"} · first{" "}
                {formatDateMedium(row.firstReportedAt)} · latest{" "}
                {formatDateMedium(row.latestReportedAt)}
              </p>
              <StatusBadge
                status={row.moderationUnpublished ? "unpublished" : row.status}
                size="sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => setReview(row)}
              >
                Review
              </button>
              {canModerate ? (
                <>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    onClick={() => {
                      setReview(row);
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className={buttonClass("primary", "sm")}
                    onClick={() => setModerate(toModerationRow(row))}
                  >
                    Moderate
                  </button>
                </>
              ) : null}
            </div>
          </article>
        );
      })}

      {nextCursor ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() =>
              router.push(
                `/admin/events?tab=flagged&flaggedCursor=${encodeURIComponent(nextCursor)}`,
              )
            }
          >
            Load more
          </button>
        </div>
      ) : null}

      <ReportReviewDrawer
        open={!!review}
        flagged={review}
        canModerate={canModerate}
        onClose={() => setReview(null)}
        onModerate={() => {
          if (review) setModerate(toModerationRow(review));
        }}
        onChanged={() => router.refresh()}
      />

      <ModerateEventModal
        open={!!moderate}
        row={moderate}
        canModerate={canModerate}
        isOwner={isOwner}
        onClose={() => setModerate(null)}
        onUnpublished={(id) => setUndoId(id)}
      />
      <UnpublishUndoToast eventId={undoId} onDone={() => setUndoId(null)} />
    </div>
  );
}
