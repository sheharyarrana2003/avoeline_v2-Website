import { notFound } from "next/navigation";
import { CertificateTemplate, CertificateTemplateService, initialTemplate } from "@/src/services/certificate.template.services";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { DesignPicker } from "@/src/features/certificates/components/DesignPicker";
import { applyCertificateDesign } from "@/src/features/certificates/actions/applyDesign.action";
import MakingTemplateUi from "./makingTemplateUi";

export default async function MakingTemplate({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const eventId = resolvedParams.eventId;

    // Was missing entirely. `proxy.ts` admits any organizer under /organizer, so
    // without this an organizer could open this route with another organizer's
    // event id in the path and save a certificate template onto their event.
    const event = await assertOwnedEvent(eventId);
    if (!event) notFound();

    const template = await CertificateTemplateService.get_template_of_organizer(eventId) || initialTemplate;

    const save_template_to_server = async (template: CertificateTemplate) => {
        'use server'
        // Re-checked inside the action too: this closure is a public endpoint and
        // the page guard above only ran for whoever loaded the page.
        if (!(await assertOwnedEvent(eventId))) return;
        await CertificateTemplateService.save_template_of_organizer(template, eventId);
    }

    return (
        <div className="space-y-8">
            <Card title="Start from a design">
                <CardBody>
                    <p className="pb-3 text-xs text-ink-soft">
                        Applying a design restyles the certificate and keeps your wording. Everything is
                        still editable below.
                    </p>
                    <DesignPicker apply={applyCertificateDesign.bind(null, eventId)} current={template.primary_color} />
                </CardBody>
            </Card>

            <MakingTemplateUi initialTemplate={template} save_template={save_template_to_server} />
        </div>
    )
}
