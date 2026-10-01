import { DashboardNav } from "@/src/shared_components/DashboardNav";
import { SupportPreviewBanner } from "@/src/shared_components/SupportPreviewBanner";
import { AppFooter } from "@/src/shared_components/chrome/AppFooter";
import { RequireRole } from "@/src/features/auth/components/RequireRole";
import { AuthService } from "@/src/features/auth/authService";
import { isSupportViewer } from "@/src/features/admin/supportPreview";
import { departmentChrome } from "@/src/features/department/department.service";

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
    const user = await AuthService.getCurrentUser();
    const support = isSupportViewer(user);
    const chrome = user?.userId
        ? await departmentChrome({ userId: user.userId, orgId: user.orgId, name: user.name, email: user.email })
        : { name: "Department", items: [] as Awaited<ReturnType<typeof departmentChrome>>["items"] };

    return (
        <RequireRole allow={["platform_admin", "department_admin"]}>
            {support ? <SupportPreviewBanner label="Department" /> : null}
            <DashboardNav
                basePath="/department"
                homeHref="/department"
                showAccount={false}
                name={chrome.name}
                items={chrome.items}
            />
            <div className="flex flex-1 flex-col md:pl-52">
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
                <AppFooter compact />
            </div>
        </RequireRole>
    );
}
