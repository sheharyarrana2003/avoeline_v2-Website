import { redirect } from "next/navigation";
import VendorMarketplace from "@/src/app/organizer/[organizer_id]/vendor-marketplace/page";
import { getDepartmentPlan, resolveDepartment } from "@/src/features/department/department.service";

export const metadata = { title: "Marketplace — Avoeline" };

export default async function DepartmentMarketplacePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { user, department } = await resolveDepartment();
    const plan = await getDepartmentPlan(department.id);
    if (!plan?.modules.includes("vendor_store")) redirect("/department");

    return VendorMarketplace({
        params: Promise.resolve({ organizer_id: user.userId }),
        searchParams,
        listingPath: "/department/marketplace",
    });
}
