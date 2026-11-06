import { notFound } from "next/navigation";
import { getCustomFormByToken } from "@/src/features/custom_forms/customForms.service";
import { PublicFormClient } from "@/src/features/custom_forms/components/PublicFormClient";
import { sanitizeLibraryFields } from "@/src/features/custom_forms/types";

export default async function PublicCustomFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const form = await getCustomFormByToken(token);
  if (!form) notFound();
  if (form.status === "draft") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <p className="text-sm text-ink-soft">This form is still a draft and is not open yet.</p>
      </main>
    );
  }
  if (form.status === "closed") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <p className="text-sm text-ink-soft">This form is closed.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <PublicFormClient
        token={form.publicToken}
        title={form.title}
        description={form.description}
        fields={sanitizeLibraryFields(form.fields)}
      />
    </main>
  );
}
