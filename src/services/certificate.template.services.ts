
import { adminAuth, adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";

export interface Style_attributes {
    id?: string;
    type?: "text" | "image";
    content?: string;
    src?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    align?: "left" | "center" | "right" | "justify";
    color?: string;
    lineHeight?: number;
    editable?: boolean;
    binding?: string;
}

export interface Canvas {
    width: number;
    height: number;
    background: string;
    showGrid: boolean;
}

export interface Blockchain {
    enabled: boolean;
    network: string;
}

export interface CertificateTemplate {
    templateId: string;
    organizer_id: string;
    templateName: string;

    // Theme & Frame Styling
    primary_color: string;
    secondary_color: string;
    border_color: string;
    border_size: number;
    border_style: string;
    logo_src: string;

    // Content & Styling Attributes for every element
    heading_content: string;
    heading_styling: Style_attributes;

    title_content: string;
    title_styling: Style_attributes;

    name_content: string;
    name_styling: Style_attributes;

    achievement_content: string;
    achievement_styling: Style_attributes;

    date_content: string;
    date_styling: Style_attributes;

    issuer_name_content: string;
    issuer_name_styling: Style_attributes;

    issuer_designation_content: string;
    issuer_designation_styling: Style_attributes;

    signature_src: string;
    signature_styling: Style_attributes;

    canvas: Canvas;
    blockchain: Blockchain;
}

// Helper to map dynamic style blocks safely with standard defaults
function mapStyleAttributes(data: any, defaults: Partial<Style_attributes> = {}): Style_attributes {
    if (!data) return defaults;
    return {
        fontFamily: data.fontFamily ?? defaults.fontFamily ?? "Arial, sans-serif",
        fontSize: data.fontSize ? Number(data.fontSize) : defaults.fontSize ?? 14,
        fontWeight: data.fontWeight ?? defaults.fontWeight ?? "normal",
        align: ["left", "center", "right", "justify"].includes(data.align)
            ? data.align
            : defaults.align ?? "center",
        color: data.color ?? defaults.color ?? "#333333",
        lineHeight: data.lineHeight ? Number(data.lineHeight) : defaults.lineHeight,
        x: Number(data.x) || defaults.x || 0,
        y: Number(data.y) || defaults.y || 0,
        width: Number(data.width) || defaults.width || 0,
        height: Number(data.height) || defaults.height || 0,
        editable: Boolean(data.editable ?? defaults.editable ?? true),
        binding: data.binding ?? defaults.binding ?? "",
    };
}

export function mapJsonToTemplate(data: any): CertificateTemplate {
    if (!data) {
        throw new Error("Cannot map empty or undefined data to CertificateTemplate");
    }

    return {
        templateId: data.templateId ?? "",
        organizer_id: data.organizer_id ?? "",
        templateName: data.templateName ?? "",

        // Theme & Frame Styling Mapping
        primary_color: data.primary_color ?? "#1A365D",
        secondary_color: data.secondary_color ?? "#D69E2E",
        border_color: data.border_color ?? "#1A365D",
        border_size: Number(data.border_size) || 4,
        border_style: data.border_style ?? "solid",
        logo_src: data.logo_src ?? data.logo ?? "",

        // Heading
        heading_content: data.heading_content ?? data.heading_of_certificate ?? "CERTIFICATE OF APPRECIATION",
        heading_styling: mapStyleAttributes(data.heading_styling, {
            fontFamily: data.heading_font_family ?? "Georgia, serif",
            fontSize: data.heading_font_size ?? 32,
            fontWeight: data.heading_font_weight ?? "bold",
            color: data.heading_color ?? data.primary_color ?? "#1A365D",
            align: data.heading_text_align ?? "center",
            binding: "heading_of_certificate",
        }),

        // Title
        title_content: data.title_content ?? data.title ?? "THIS IS PROUDLY PRESENTED TO",
        title_styling: mapStyleAttributes(data.title_styling, {
            fontFamily: data.title_font_family ?? "Arial, sans-serif",
            fontSize: data.title_font_size ?? 14,
            fontWeight: data.title_font_weight ?? "normal",
            color: data.title_color ?? "#718096",
            align: data.title_text_align ?? "center",
            binding: "title",
        }),

        // Recipient Name
        name_content: data.name_content ?? data.name ?? "Alex Morgan",
        name_styling: mapStyleAttributes(data.name_styling, {
            fontFamily: data.name_font_family ?? "Georgia, serif",
            fontSize: data.name_font_size ?? 28,
            fontWeight: data.name_font_weight ?? "bold",
            color: data.name_color ?? data.secondary_color ?? "#D69E2E",
            align: data.name_text_align ?? "center",
            binding: "name",
        }),

        // Achievement Body
        achievement_content: data.achievement_content ?? data.achievement_statement ?? "For outstanding dedication and performance.",
        achievement_styling: mapStyleAttributes(data.achievement_styling, {
            fontFamily: data.achievement_font_family ?? "Arial, sans-serif",
            fontSize: data.achievement_font_size ?? 14,
            fontWeight: data.achievement_font_weight ?? "normal",
            color: data.achievement_color ?? "#2D3748",
            lineHeight: data.achievement_line_height ?? 1.6,
            align: data.achievement_text_align ?? "center",
            binding: "achievement_statement",
        }),

        // Date
        date_content: data.date_content ?? data.date ?? "July 25, 2026",
        date_styling: mapStyleAttributes(data.date_styling, {
            fontFamily: data.date_font_family ?? "Arial, sans-serif",
            fontSize: data.date_font_size ?? 12,
            fontWeight: data.date_font_weight ?? "normal",
            color: data.date_text_color ?? "#4A5568",
            binding: "date",
        }),

        // Issuer Details
        issuer_name_content: data.issuer_name_content ?? data.issuer_name ?? "Jane Doe",
        issuer_name_styling: mapStyleAttributes(data.issuer_name_styling, {
            fontFamily: data.issuer_name_font_family ?? "Arial, sans-serif",
            fontSize: data.issuer_name_font_size ?? 16,
            fontWeight: data.issuer_name_font_weight ?? "bold",
            color: data.issuer_name_color ?? data.primary_color ?? "#1A365D",
            binding: "issuer_name",
        }),

        issuer_designation_content: data.issuer_designation_content ?? data.issuer_designation ?? "Director of Operations",
        issuer_designation_styling: mapStyleAttributes(data.issuer_designation_styling, {
            fontFamily: data.issuer_designation_font_family ?? "Arial, sans-serif",
            fontSize: data.issuer_designation_font_size ?? 12,
            fontWeight: data.issuer_designation_font_weight ?? "normal",
            color: data.issuer_designation_color ?? "#718096",
            binding: "issuer_designation",
        }),

        signature_src: data.signature_src ?? data.signature_of_issuer ?? "",
        signature_styling: mapStyleAttributes(data.signature_styling, {
            binding: "signature_of_issuer",
        }),

        // Canvas & Blockchain configuration
        canvas: {
            width: Number(data.canvas?.width) || 700,
            height: Number(data.canvas?.height) || 500,
            background: data.canvas?.background ?? "#ffffff",
            showGrid: Boolean(data.canvas?.showGrid),
        },
        blockchain: {
            enabled: Boolean(data.blockchain?.enabled),
            network: data.blockchain?.network ?? "Polygon",
        },
    };
}export const initialTemplate: CertificateTemplate = {
    templateId: "techverse-hackathon-2026",
    templateName: "Event Name",
    organizer_id: "",

    // Frame & Theme Styling
    primary_color: "#111111",
    secondary_color: "#64748b",
    border_color: "#cbd5e1",
    border_size: 2,
    border_style: "solid",
    logo_src: "",

    // Heading (Mapped from el_cert_type)
    heading_content: "CERTIFICATE OF EXCELLENCE",
    heading_styling: {
        id: "el_cert_type",
        type: "text",
        x: 150,
        y: 215,
        width: 400,
        height: 24,
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: "normal",
        align: "center",
        color: "#64748b",
        editable: true,
        binding: "certificateType",
    },

    // Title (Mapped from el_intro)
    title_content: "this is to certify that",
    title_styling: {
        id: "el_intro",
        type: "text",
        x: 150,
        y: 265,
        width: 400,
        height: 20,
        fontFamily: "Georgia",
        fontSize: 14,
        fontWeight: "normal",
        align: "center",
        color: "#94a3b8",
        editable: false,
        binding: "introLabel",
    },

    // Recipient Name (Mapped from el_recipient_name)
    name_content: "Attendee Name",
    name_styling: {
        id: "el_recipient_name",
        type: "text",
        x: 130,
        y: 288,
        width: 440,
        height: 36,
        fontFamily: "Georgia",
        fontSize: 26,
        fontWeight: "bold",
        align: "center",
        color: "#111111",
        editable: true,
        binding: "recipientName",
    },

    // Achievement Body (Mapped from el_custom_statement)
    achievement_content: "For outstanding performance and technical innovation demonstrated during event",
    achievement_styling: {
        id: "el_custom_statement",
        type: "text",
        x: 110,
        y: 335,
        width: 480,
        height: 44,
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: "normal",
        align: "center",
        color: "#475569",
        editable: true,
        binding: "customStatement",
    },

    // Date (Mapped from el_issue_date)
    date_content: "March 15, 2026",
    date_styling: {
        id: "el_issue_date",
        type: "text",
        x: 60,
        y: 425,
        width: 160,
        height: 20,
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: "normal",
        align: "left",
        color: "#94a3b8",
        editable: true,
        binding: "issueDate",
    },

    // Issuer Name (Mapped from el_issuer_name)
    issuer_name_content: "Dr. Sarah Khan",
    issuer_name_styling: {
        id: "el_issuer_name",
        type: "text",
        x: 260,
        y: 405,
        width: 220,
        height: 30,
        fontFamily: "Georgia",
        fontSize: 20,
        fontWeight: "normal",
        align: "center",
        color: "#111111",
        editable: true,
        binding: "issuerName",
    },

    // Issuer Designation (Mapped from el_issuer_title)
    issuer_designation_content: "HEAD OF ENGINEERING",
    issuer_designation_styling: {
        id: "el_issuer_title",
        type: "text",
        x: 260,
        y: 438,
        width: 220,
        height: 18,
        fontFamily: "Inter",
        fontSize: 10,
        fontWeight: "normal",
        align: "center",
        color: "#64748b",
        editable: true,
        binding: "issuerTitle",
    },

    // Signature / Verification QR Position (Mapped from el_qr)
    signature_src: "",
    signature_styling: {
        id: "el_qr",
        type: "image",
        x: 560,
        y: 405,
        width: 48,
        height: 48,
        editable: false,
        binding: "verificationQr",
    },

    // Canvas Properties
    canvas: {
        width: 700,
        height: 500,
        background: "#fdfdfb",
        showGrid: true,
    },

    // Blockchain Properties
    blockchain: {
        enabled: true,
        network: "Polygon",
    },
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
        }else{
            return initialTemplate;
        }

    },
    async insert_generic_Template(organizer_id: string){
        await CertificateTemplateService.save_template_of_organizer(initialTemplate,organizer_id);
    }
}