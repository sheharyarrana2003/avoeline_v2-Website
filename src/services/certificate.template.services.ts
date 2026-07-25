
import { adminAuth, adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";

// --- Interfaces ---
export interface Style_attributes {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    align?: "left" | "center" | "right" | "justify";
    lineHeight?: number;
}

export interface Canvas {
    width: number;
    height: number;
    showGrid?: boolean;
}

export interface Blockchain {
    enabled: boolean;
    network: string;
}

export interface CertificateTemplate {
    templateId: string;
    organizer_id: string;
    templateName: string;
    canvas: Canvas;
    blockchain: Blockchain;

    primary_color: string;
    secondary_color: string;
    border_color: string;
    border_size: number;
    border_style: string;

    logo_src: string;
    logo_styling: Style_attributes;

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
}

// Helper to map dynamic style blocks safely with standard defaults (Firestore Safe)
function mapStyleAttributes(data: any, defaults: Partial<Style_attributes> = {}): Style_attributes {
    const raw = data || {};
    
    return {
        x: Number(raw.x ?? defaults.x) || 0,
        y: Number(raw.y ?? defaults.y) || 0,
        width: Number(raw.width ?? defaults.width) || 0,
        height: Number(raw.height ?? defaults.height) || 0,

        fontFamily: raw.fontFamily ?? defaults.fontFamily ?? "Arial, sans-serif",
        fontSize: raw.fontSize ? Number(raw.fontSize) : defaults.fontSize ?? 14,
        fontWeight: raw.fontWeight ?? defaults.fontWeight ?? "normal",
        align: ["left", "center", "right", "justify"].includes(raw.align)
            ? raw.align
            : defaults.align ?? "center",
        color: raw.color ?? defaults.color ?? "#333333",

        lineHeight: raw.lineHeight ? Number(raw.lineHeight) : defaults.lineHeight ?? 1.2,
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

        // Logo
        logo_src: data.logo_src ?? data.logo ?? "",
        logo_styling: mapStyleAttributes(data.logo_styling, {
            x: 326,
            y: 20,
            width: 48,
            height: 48,
        }),

        // Heading
        heading_content: data.heading_content ?? data.heading_of_certificate ?? "CERTIFICATE OF APPRECIATION",
        heading_styling: mapStyleAttributes(data.heading_styling, {
            fontFamily: data.heading_font_family ?? "Georgia, serif",
            fontSize: data.heading_font_size ?? 32,
            fontWeight: data.heading_font_weight ?? "bold",
            color: data.heading_color ?? data.primary_color ?? "#1A365D",
            align: data.heading_text_align ?? "center",
            x: 100,
            y: 80,
            width: 500,
            height: 50,
        }),

        // Title
        title_content: data.title_content ?? data.title ?? "THIS IS PROUDLY PRESENTED TO",
        title_styling: mapStyleAttributes(data.title_styling, {
            fontFamily: data.title_font_family ?? "Arial, sans-serif",
            fontSize: data.title_font_size ?? 14,
            fontWeight: data.title_font_weight ?? "normal",
            color: data.title_color ?? "#718096",
            align: data.title_text_align ?? "center",
            x: 150,
            y: 150,
            width: 400,
            height: 24,
        }),

        // Recipient Name
        name_content: data.name_content ?? data.name ?? "Alex Morgan",
        name_styling: mapStyleAttributes(data.name_styling, {
            fontFamily: data.name_font_family ?? "Georgia, serif",
            fontSize: data.name_font_size ?? 28,
            fontWeight: data.name_font_weight ?? "bold",
            color: data.name_color ?? data.secondary_color ?? "#D69E2E",
            align: data.name_text_align ?? "center",
            x: 100,
            y: 190,
            width: 500,
            height: 48,
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
            x: 100,
            y: 250,
            width: 500,
            height: 60,
        }),

        // Date
        date_content: data.date_content ?? data.date ?? "July 25, 2026",
        date_styling: mapStyleAttributes(data.date_styling, {
            fontFamily: data.date_font_family ?? "Arial, sans-serif",
            fontSize: data.date_font_size ?? 12,
            fontWeight: data.date_font_weight ?? "normal",
            color: data.date_text_color ?? "#4A5568",
            align: "left",
            x: 80,
            y: 400,
            width: 180,
            height: 24,
        }),

        // Issuer Details
        issuer_name_content: data.issuer_name_content ?? data.issuer_name ?? "Jane Doe",
        issuer_name_styling: mapStyleAttributes(data.issuer_name_styling, {
            fontFamily: data.issuer_name_font_family ?? "Georgia, serif",
            fontSize: data.issuer_name_font_size ?? 16,
            fontWeight: data.issuer_name_font_weight ?? "bold",
            color: data.issuer_name_color ?? data.primary_color ?? "#1A365D",
            align: "center",
            x: 440,
            y: 390,
            width: 180,
            height: 28,
        }),

        issuer_designation_content: data.issuer_designation_content ?? data.issuer_designation ?? "Director of Operations",
        issuer_designation_styling: mapStyleAttributes(data.issuer_designation_styling, {
            fontFamily: data.issuer_designation_font_family ?? "Arial, sans-serif",
            fontSize: data.issuer_designation_font_size ?? 12,
            fontWeight: data.issuer_designation_font_weight ?? "normal",
            color: data.issuer_designation_color ?? "#718096",
            align: "center",
            x: 440,
            y: 420,
            width: 180,
            height: 20,
        }),

        // Signature
        signature_src: data.signature_src ?? data.signature_of_issuer ?? "",
        signature_styling: mapStyleAttributes(data.signature_styling, {
            x: 480,
            y: 330,
            width: 100,
            height: 50,
        }),

        // Canvas & Blockchain Configuration
        canvas: {
            width: Number(data.canvas?.width) || 700,
            height: Number(data.canvas?.height) || 500,
            showGrid: Boolean(data.canvas?.showGrid),
        },
        blockchain: {
            enabled: Boolean(data.blockchain?.enabled),
            network: data.blockchain?.network ?? "Polygon",
        },
    };
}

export const initialTemplate: CertificateTemplate = {
    templateId: "techverse-hackathon-2026",
    templateName: "Event Name",
    organizer_id: "",

    // Frame & Theme Styling
    primary_color: "#111111",
    secondary_color: "#64748b",
    border_color: "#cbd5e1",
    border_size: 2,
    border_style: "solid",

    // Logo
    logo_src: "",
    logo_styling: {
        x: 326,
        y: 20,
        width: 48,
        height: 48,
    },

    // Heading
    heading_content: "CERTIFICATE OF EXCELLENCE",
    heading_styling: {
        x: 150,
        y: 215,
        width: 400,
        height: 24,
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: "normal",
        align: "center",
        color: "#64748b",
        lineHeight: 1.2,
    },

    // Title
    title_content: "this is to certify that",
    title_styling: {
        x: 150,
        y: 265,
        width: 400,
        height: 20,
        fontFamily: "Georgia",
        fontSize: 14,
        fontWeight: "normal",
        align: "center",
        color: "#94a3b8",
        lineHeight: 1.2,
    },

    // Recipient Name
    name_content: "Attendee Name",
    name_styling: {
        x: 130,
        y: 288,
        width: 440,
        height: 36,
        fontFamily: "Georgia",
        fontSize: 26,
        fontWeight: "bold",
        align: "center",
        color: "#111111",
        lineHeight: 1.2,
    },

    // Achievement Body
    achievement_content: "For outstanding performance and technical innovation demonstrated during event",
    achievement_styling: {
        x: 110,
        y: 335,
        width: 480,
        height: 44,
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: "normal",
        align: "center",
        color: "#475569",
        lineHeight: 1.6,
    },

    // Date
    date_content: "March 15, 2026",
    date_styling: {
        x: 60,
        y: 425,
        width: 160,
        height: 20,
        fontFamily: "Inter",
        fontSize: 13,
        fontWeight: "normal",
        align: "left",
        color: "#94a3b8",
        lineHeight: 1.2,
    },

    // Issuer Name
    issuer_name_content: "Dr. Sarah Khan",
    issuer_name_styling: {
        x: 260,
        y: 405,
        width: 220,
        height: 30,
        fontFamily: "Georgia",
        fontSize: 20,
        fontWeight: "normal",
        align: "center",
        color: "#111111",
        lineHeight: 1.2,
    },

    // Issuer Designation
    issuer_designation_content: "HEAD OF ENGINEERING",
    issuer_designation_styling: {
        x: 260,
        y: 438,
        width: 220,
        height: 18,
        fontFamily: "Inter",
        fontSize: 10,
        fontWeight: "normal",
        align: "center",
        color: "#64748b",
        lineHeight: 1.2,
    },

    // Signature
    signature_src: "",
    signature_styling: {
        x: 560,
        y: 405,
        width: 48,
        height: 48,
    },

    // Canvas Properties
    canvas: {
        width: 700,
        height: 500,
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
        console.log("about to save ",template);
        const template_to_be_added: CertificateTemplate = mapJsonToTemplate(template);
        template_to_be_added.organizer_id = organizer_id; 
        template_to_be_added.templateId = organizer_id;

        const cleanTemplate = JSON.parse(JSON.stringify(template_to_be_added));
    
        await adminDb.collection(COLLECTIONS.CERTIFICATE_TEMPLATE).doc(organizer_id).set({
            ...cleanTemplate
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