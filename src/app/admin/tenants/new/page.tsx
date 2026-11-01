import { redirect } from "next/navigation";

export default function NewTenantPage() {
  redirect("/admin/tenants");
}
