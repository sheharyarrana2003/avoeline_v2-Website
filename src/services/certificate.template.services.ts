
import { adminAuth, adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";

function mapJsonToTemplate(data: any): CertificateTemplate {
    if (!data) {
        throw new Error("Cannot map empty or undefined data to CertificateTemplate");
    }

    const elements: CertElement[] = Array.isArray(data.elements)
        ? data.elements.map((el: any) => ({
              id: el.id ?? "",
              type: el.type === "image" ? "image" : "text",
              content: el.content ?? "",
              src: el.src ?? undefined,
              x: Number(el.x) || 0,
              y: Number(el.y) || 0,
              width: Number(el.width) || 0,
              height: Number(el.height) || 0,
              fontFamily: el.fontFamily ?? undefined,
              fontSize: el.fontSize ? Number(el.fontSize) : undefined,
              fontWeight: ["normal", "medium", "bold"].includes(el.fontWeight)
                  ? el.fontWeight
                  : undefined,
              align: ["left", "center", "right"].includes(el.align)
                  ? el.align
                  : undefined,
              color: el.color ?? undefined,
              editable: Boolean(el.editable),
              binding: el.binding ?? "",
          }))
        : [];

    return {
        templateId: data.templateId ?? "",
        organizer_id: data.organizer_id ?? "",
        templateName: data.templateName ?? "",
        canvas: {
            width: Number(data.canvas?.width) || 700,
            height: Number(data.canvas?.height) || 500,
            background: data.canvas?.background ?? "#ffffff",
            showGrid: Boolean(data.canvas?.showGrid),
        },
        elements,
        blockchain: {
            enabled: Boolean(data.blockchain?.enabled),
            network: data.blockchain?.network ?? "Polygon",
        },
    };
}
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
    templateName: string;
    canvas: Canvas;
    elements: CertElement[];
    blockchain: Blockchain;
};



export const initialTemplate : CertificateTemplate = {
    templateId: "techverse-hackathon-2026",
    templateName: "TechVerse Hackathon Certificate",
    organizer_id : "",
    canvas: {
        width: 700,
        height: 500,
        background: "#fdfdfb",
        showGrid: true,
    },
    elements: [
        {
            id: "el_logo",
            type: "image",
            content: "",
            src: "",
            x: 326, y: 20, width: 48, height: 48,
            editable: false,
            binding: "logo",
        },
        {
            id: "el_organizer",
            type: "text",
            content: "TECHVERSE ORGANIZER",
            x: 165, y: 80, width: 370, height: 20,
            fontFamily: "Inter", fontSize: 11, fontWeight: "normal",
            align: "center", color: "#94a3b8",
            editable: true, binding: "organizerName",
        },
        {
            id: "el_event_name",
            type: "text",
            content: "TechVerse Hackathon 2026",
            x: 150, y: 145, width: 400, height: 60,
            fontFamily: "Clash Display", fontSize: 36, fontWeight: "bold",
            align: "center", color: "#111111",
            editable: true, binding: "eventName",
        },
        {
            id: "el_cert_type",
            type: "text",
            content: "CERTIFICATE OF EXCELLENCE",
            x: 150, y: 215, width: 400, height: 24,
            fontFamily: "Inter", fontSize: 13, fontWeight: "normal",
            align: "center", color: "#64748b",
            editable: true, binding: "certificateType",
        },
        {
            id: "el_intro",
            type: "text",
            content: "this is to certify that",
            x: 150, y: 265, width: 400, height: 20,
            fontFamily: "Georgia", fontSize: 14, fontWeight: "normal",
            align: "center", color: "#94a3b8",
            editable: false, binding: "introLabel",
        },
        {
            id: "el_recipient_name",
            type: "text",
            content: "Attendee Name",
            x: 130, y: 288, width: 440, height: 36,
            fontFamily: "Georgia", fontSize: 26, fontWeight: "bold",
            align: "center", color: "#111111",
            editable: true, binding: "recipientName",
        },
        {
            id: "el_custom_statement",
            type: "text",
            content: "For outstanding performance and technical innovation demonstrated during the 48-hour global blockchain hackathon.",
            x: 110, y: 335, width: 480, height: 44,
            fontFamily: "Inter", fontSize: 13, fontWeight: "normal",
            align: "center", color: "#475569",
            editable: true, binding: "customStatement",
        },
        {
            id: "el_issue_date",
            type: "text",
            content: "March 15, 2026",
            x: 60, y: 425, width: 160, height: 20,
            fontFamily: "Inter", fontSize: 13, fontWeight: "normal",
            align: "left", color: "#94a3b8",
            editable: true, binding: "issueDate",
        },
        {
            id: "el_issuer_name",
            type: "text",
            content: "Dr. Sarah Khan",
            x: 260, y: 405, width: 220, height: 30,
            fontFamily: "Georgia", fontSize: 20, fontWeight: "normal",
            align: "center", color: "#111111",
            editable: true, binding: "issuerName",
        },
        {
            id: "el_issuer_title",
            type: "text",
            content: "HEAD OF ENGINEERING",
            x: 260, y: 438, width: 220, height: 18,
            fontFamily: "Inter", fontSize: 10, fontWeight: "normal",
            align: "center", color: "#64748b",
            editable: true, binding: "issuerTitle",
        },
        {
            id: "el_qr",
            type: "image",
            content: "",
            src: "",
            x: 560, y: 405, width: 48, height: 48,
            editable: false,
            binding: "verificationQr",
        },
    ] as CertElement[],
    blockchain: {
        enabled: true,
        network: "Polygon",
    }
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

    },
    async insert_generic_Template(organizer_id: string){
        await CertificateTemplateService.save_template_of_organizer(initialTemplate,organizer_id);
    }
}