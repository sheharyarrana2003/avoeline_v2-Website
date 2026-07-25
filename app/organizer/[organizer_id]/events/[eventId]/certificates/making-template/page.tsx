
import { CertificateTemplate, CertificateTemplateService, initialTemplate } from "@/src/services/certificate.template.services";
import MakingTemplateUi from "./makingTemplateUi";


export default async function MakingTemplate({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = await params;
    const eventId = resolvedParams.eventId;
    const template = await CertificateTemplateService.get_template_of_organizer(eventId) || initialTemplate ;

    const save_template_to_server = async (template: CertificateTemplate) => {
        'use server'
        // basically update certificate template in colllection
        await CertificateTemplateService.save_template_of_organizer(template, eventId);
    }

   
    return (
        <>
            <MakingTemplateUi initialTemplate={template} save_template={save_template_to_server}/>
        </>
    )
}