import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Sparkles } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { requireAdminArea } from "@/src/features/admin/guard";
import { CategoryEngineService } from "@/src/features/taxonomy/categoryEngine.service";
import { CategoryManagementView } from "@/src/features/taxonomy/components/CategoryManagementView";
import { seedTaxonomyAction } from "@/src/features/taxonomy/actions/taxonomy.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (!(await requireAdminArea("categories"))) redirect("/admin/signin?next=/admin/categories");

  const [{ e }, superCategories, eventFormats, fieldSets, checklistTemplates, pendingRequests] =
    await Promise.all([
      searchParams,
      CategoryEngineService.getAllSuperCategories(),
      CategoryEngineService.getAllEventFormats(),
      CategoryEngineService.getAllFieldSets(),
      CategoryEngineService.getAllChecklistTemplates(),
      CategoryEngineService.getCategoryRequests("pending"),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Category & Taxonomy Engine"
          description="Manage Super Categories, Event Formats, custom attribute schemas, and automated checklist templates for event creation."
        />

        <div className="flex flex-wrap items-center gap-2">
        <form action={seedTaxonomyAction}>
          <SubmitButton className={buttonClass("secondary")}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Seed defaults
          </SubmitButton>
        </form>
        <Link
          href="/admin/category-requests"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-muted"
        >
          <Inbox className="h-4 w-4 text-ink-soft" />
          <span>Category Requests Queue</span>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-ink">
              {pendingRequests.length} pending
            </span>
          )}
        </Link>
        </div>
      </div>

      <FormFeedback error={e} />
      {eventFormats.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No formats yet. Seed defaults adds the standard categories and formats, including Hackathon, which turns on the hackathon tools for an event.
        </p>
      ) : null}

      <CategoryManagementView
        superCategories={superCategories}
        eventFormats={eventFormats}
        fieldSets={fieldSets}
        checklistTemplates={checklistTemplates}
      />
    </div>
  );
}
