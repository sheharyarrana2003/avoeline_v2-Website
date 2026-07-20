
import { adminAuth, adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";

export interface CertElement {
    id: string;
    type: "text" | "image";
    content: string;
    src?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: "normal" | "medium" | "bold";
    align?: "left" | "center" | "right";
    color?: string;
    editable: boolean;
    binding: string;
};

export interface Canvas {
    width: number;
    height: number;
    background: string;
    showGrid: boolean;
}

export interface Blockchain {
    enabled: boolean;
    network: String;
}

export interface CertificateTemplate {
    templateId: string,
organizer_id : string;
    templateName: String;
    canvas: Canvas;
    elements: CertElement[];
    blockchain: Blockchain;
};

export const CertificateTemplateService = {
    async save_template_of_organizer(template: CertificateTemplate, organizer_id: string) {
        const template_to_be_added: CertificateTemplate = mapJsonToTemplate(template);
        template_to_be_added.organizer_id = organizer_id; 
        template_to_be_added.templateId = organizer_id;

        await adminDb.collection(COLLECTIONS.CERTIFICATE_TEMPLATE).doc(organizer_id).set({
            ...template_to_be_added
        })
        return organizer_id;


    },
    async get_template_of_organizer(organizer_id: string) {

        const docSnap = await adminDb.collection(COLLECTIONS.CERTIFICATE_TEMPLATE).doc(organizer_id).get();
        if (docSnap.exists) {
            return mapJsonToTemplate(docSnap.data());
        }

    }
}