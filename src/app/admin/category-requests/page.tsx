import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { requireAdminArea } from "@/src/features/admin/guard";
import { CategoryEngineService } from "@/src/features/taxonomy/categoryEngine.service";
import { CategoryRequestsView } from "@/src/features/taxonomy/components/CategoryRequestsView";

export const dynamic = "force-dynamic";

export default async function AdminCategoryRequestsPage() {
  if (!(await requireAdminArea("categories"))) redirect("/admin/signin?next=/admin/category-requests");

  const requests = await CategoryEngineService.getCategoryRequests();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Category Engine</span>
        </Link>
      </div>

      <PageHeader
        title="Category Approval Queue"
        description="Review submissions from organizers requesting new Super Categories or Event Formats. Approved categories become immediately available across the platform."
      />

      <CategoryRequestsView requests={requests} />
    </div>
  );
}
