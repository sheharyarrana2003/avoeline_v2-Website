import { notFound } from "next/navigation";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { applyByTokenFormAction } from "@/src/features/teams/actions/applyForm.action";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { CustomFieldsRenderer } from "@/src/features/events/components/CustomFieldsRenderer";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import type { CustomField } from "@/src/services/models/event.model";

export default async function PublicApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ e?: string; ok?: string }>;
}) {
  const { token } = await params;
  const sp = searchParams ? await searchParams : {};
  const form = await TeamEngineService.getRecruitmentFormByToken(token);
  if (!form) notFound();

  const fields: CustomField[] = form.fields.map((f) => ({
    id: f.key,
    label: f.label,
    type: f.type === "select" ? "dropdown" : f.type === "checkbox" ? "checkboxes" : f.type,
    options: f.options,
    required: !!f.required,
  }));

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <Card title={form.title || "Application"}>
        <CardBody className="space-y-5">
          <FormFeedback error={sp.e} success={sp.ok} />
          {form.intro ? <p className="text-sm text-ink-soft">{form.intro}</p> : null}
          {!form.isOpen ? (
            <p className="text-sm text-ink-soft">This form is closed.</p>
          ) : form.closesAt &&
            // eslint-disable-next-line react-hooks/purity -- server request-time deadline check
            new Date(form.closesAt).getTime() < Date.now() ? (
            <p className="text-sm text-ink-soft">This form has closed.</p>
          ) : sp.ok ? null : (
            <form action={applyByTokenFormAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {/* honeypot */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div>
                <label className={labelClass} htmlFor="apply-name">
                  Full name
                </label>
                <input id="apply-name" name="name" required className={fieldClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="apply-email">
                  Email
                </label>
                <input id="apply-email" name="email" type="email" required className={fieldClass} />
              </div>
              <CustomFieldsRenderer fields={fields} />
              <button type="submit" className={buttonClass("primary", "md")}>
                Submit application
              </button>
            </form>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
