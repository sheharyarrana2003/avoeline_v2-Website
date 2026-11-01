"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { adminEventsHref } from "@/src/features/admin/eventModeration.filters";
import type {
  AdminEventsBundle,
  AdminModerationEventRow,
} from "@/src/features/admin/eventModeration.types";
import { FilterToolbar } from "./FilterToolbar";
import { EventsTable } from "./EventsTable";
import { FlaggedEventsPanel } from "./FlaggedEventsPanel";
import { ModerationLogPanel } from "./ModerationLogPanel";
import { ModerateEventModal, UnpublishUndoToast } from "./ModerateEventModal";

function HeaderWithTooltip() {
  return (
    <PageHeader
      title="Events"
      description={
        <span className="inline-flex items-center gap-1.5">
          Every event on the platform, including drafts and private ones
          <span className="group relative inline-flex">
            <button
              type="button"
              className="rounded-full p-0.5 text-ink-faint hover:text-ink focus-visible:outline-2"
              aria-label="About unpublish and remove"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border border-line bg-paper p-3 text-xs font-normal normal-case tracking-normal text-ink-soft opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
            >
              Unpublish hides an event from public listings and is reversible. Remove is permanent.
            </span>
          </span>
        </span>
      }
    />
  );
}

export function AdminEventsPageClient({ bundle }: { bundle: AdminEventsBundle }) {
  const router = useRouter();
  const { filters, tabCounts } = bundle;
  const [moderateRow, setModerateRow] = useState<AdminModerationEventRow | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);

  const clearFilters = useCallback(() => {
    router.push(
      adminEventsHref(filters, {
        q: "",
        publication: [],
        timing: [],
        access: [],
        categoryIds: [],
        from: "",
        to: "",
        org: "",
        dept: "",
        hasRegs: null,
        sort: "newest",
        cursor: null,
      }),
    );
  }, [filters, router]);

  const tabs = [
    {
      label: "All events",
      value: "all",
      href: adminEventsHref(filters, { tab: "all", cursor: null }),
      count: tabCounts.all,
    },
    {
      label: "Flagged",
      value: "flagged",
      href: adminEventsHref(filters, { tab: "flagged", flaggedCursor: null }),
      count: tabCounts.openReports,
      warnWhenPositive: true,
    },
    {
      label: "Moderation log",
      value: "log",
      href: adminEventsHref(filters, { tab: "log", logCursor: null }),
      count: tabCounts.log,
    },
  ];

  return (
    <>
      <HeaderWithTooltip />
      <FilterTabs tabs={tabs} activeValue={filters.tab} label="Event management sections" />

      {filters.tab === "all" ? (
        <>
          <FilterToolbar
            filters={filters}
            categories={bundle.categories}
            orgOptions={bundle.orgOptions}
            deptOptions={bundle.deptOptions}
            resultCount={bundle.eventsTotalMatching}
          />
          <EventsTable
            rows={bundle.events}
            filters={filters}
            nextCursor={bundle.eventsNextCursor}
            canModerate={bundle.canModerate}
            onModerate={setModerateRow}
            onClearFilters={clearFilters}
          />
          <ModerateEventModal
            open={!!moderateRow}
            row={moderateRow}
            canModerate={bundle.canModerate}
            isOwner={bundle.isOwner}
            onClose={() => setModerateRow(null)}
            onUnpublished={(id) => setUndoId(id)}
          />
          <UnpublishUndoToast eventId={undoId} onDone={() => setUndoId(null)} />
        </>
      ) : null}

      {filters.tab === "flagged" ? (
        <FlaggedEventsPanel
          rows={bundle.flagged}
          nextCursor={bundle.flaggedNextCursor}
          canModerate={bundle.canModerate}
          isOwner={bundle.isOwner}
        />
      ) : null}

      {filters.tab === "log" ? (
        <ModerationLogPanel rows={bundle.log} filters={filters} nextCursor={bundle.logNextCursor} />
      ) : null}
    </>
  );
}
