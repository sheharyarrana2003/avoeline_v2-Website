'use client'

import { CertificateTemplate, Style_attributes, Blockchain, Canvas } from "@/src/services/certificate.template.services";
import { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation'


// --- Interfaces ---

export interface styling_options {
    primary_color: string;
    secondary_color: string;
    border_color: string;
    border_size: number;
    border_style: string;
    date_text_color: string;
    signature_color: string;
    logo: string;

    heading_of_certificate: string;
    title: string;
    name: string;
    achievement_statement: string;
    issuer_name: string;
    issuer_designation: string;
    date: string;
    signature_of_issuer: string;

    heading_font_family?: string;
    heading_font_size?: number;
    heading_font_weight?: string;
    heading_color?: string;
    heading_text_align?: "left" | "center" | "right";

    title_font_family?: string;
    title_font_size?: number;
    title_font_weight?: string;
    title_color?: string;
    title_text_align?: "left" | "center" | "right";

    name_font_family?: string;
    name_font_size?: number;
    name_font_weight?: string;
    name_color?: string;
    name_text_align?: "left" | "center" | "right";

    achievement_font_family?: string;
    achievement_font_size?: number;
    achievement_font_weight?: string;
    achievement_color?: string;
    achievement_line_height?: number;
    achievement_text_align?: "left" | "center" | "right" | "justify";

    date_font_family?: string;
    date_font_size?: number;
    date_font_weight?: string;

    issuer_name_font_family?: string;
    issuer_name_font_size?: number;
    issuer_name_font_weight?: string;
    issuer_name_color?: string;

    issuer_designation_font_family?: string;
    issuer_designation_font_size?: number;
    issuer_designation_font_weight?: string;
    issuer_designation_color?: string;
}

// --- Helpers ---

const FONT_OPTIONS = [
    "Arial, sans-serif",
    "Georgia, serif",
    "'Times New Roman', serif",
    "'Courier New', monospace",
    "'Trebuchet MS', sans-serif",
    "Verdana, sans-serif",
    "'Cinzel', serif",
    "'Montserrat', sans-serif",
];

const WEIGHT_OPTIONS = ["normal", "medium", "600", "bold"];

const getStyleForBinding = (
    binding: string,
    styling: styling_options
): Partial<React.CSSProperties> => {
    const DEFAULT_FONT = "Arial, sans-serif";
    const DEFAULT_TEXT_COLOR = "#333333";
    const PRIMARY_COLOR = styling?.primary_color || "#1a365d";

    switch (binding) {
        case "heading_of_certificate":
            return {
                fontFamily: styling?.heading_font_family || DEFAULT_FONT,
                fontSize: styling?.heading_font_size || 32,
                fontWeight: styling?.heading_font_weight || "bold",
                color: styling?.heading_color || PRIMARY_COLOR,
                textAlign: styling?.heading_text_align || "center",
            };
        case "title":
            return {
                fontFamily: styling?.title_font_family || DEFAULT_FONT,
                fontSize: styling?.title_font_size || 14,
                fontWeight: styling?.title_font_weight || "normal",
                color: styling?.title_color || DEFAULT_TEXT_COLOR,
                textAlign: styling?.title_text_align || "center",
            };
        case "name":
            return {
                fontFamily: styling?.name_font_family || DEFAULT_FONT,
                fontSize: styling?.name_font_size || 28,
                fontWeight: styling?.name_font_weight || "bold",
                color: styling?.name_color || styling?.secondary_color || PRIMARY_COLOR,
                textAlign: styling?.name_text_align || "center",
            };
        case "achievement_statement":
            return {
                fontFamily: styling?.achievement_font_family || DEFAULT_FONT,
                fontSize: styling?.achievement_font_size || 14,
                fontWeight: styling?.achievement_font_weight || "normal",
                color: styling?.achievement_color || DEFAULT_TEXT_COLOR,
                lineHeight: styling?.achievement_line_height || 1.6,
                textAlign: styling?.achievement_text_align || "center",
            };
        case "date":
            return {
                fontFamily: styling?.date_font_family || DEFAULT_FONT,
                fontSize: styling?.date_font_size || 12,
                fontWeight: styling?.date_font_weight || "normal",
                color: styling?.date_text_color || DEFAULT_TEXT_COLOR,
            };
        case "issuer_name":
            return {
                fontFamily: styling?.issuer_name_font_family || DEFAULT_FONT,
                fontSize: styling?.issuer_name_font_size || 16,
                fontWeight: styling?.issuer_name_font_weight || "bold",
                color: styling?.issuer_name_color || PRIMARY_COLOR,
            };
        case "issuer_designation":
            return {
                fontFamily: styling?.issuer_designation_font_family || DEFAULT_FONT,
                fontSize: styling?.issuer_designation_font_size || 12,
                fontWeight: styling?.issuer_designation_font_weight || "normal",
                color: styling?.issuer_designation_color || "#718096",
            };
        default:
            return {
                fontFamily: DEFAULT_FONT,
                fontSize: 14,
                fontWeight: "normal",
                color: DEFAULT_TEXT_COLOR,
            };
    }
};

// Standard layout coordinates fallback map
const DEFAULT_POSITIONS: Record<string, { x: number; y: number; width: number; height: number }> = {
    heading: { x: 100, y: 80, width: 500, height: 50 },
    title: { x: 150, y: 150, width: 400, height: 24 },
    name: { x: 100, y: 190, width: 500, height: 48 },
    achievement: { x: 100, y: 250, width: 500, height: 60 },
    date: { x: 80, y: 400, width: 180, height: 24 },
    issuer_name: { x: 440, y: 390, width: 180, height: 28 },
    issuer_designation: { x: 440, y: 420, width: 180, height: 20 },
    signature: { x: 480, y: 330, width: 100, height: 50 },
    logo: { x: 326, y: 20, width: 48, height: 48 },
};

// Helper for rendering text elements with exact coordinates
const renderTextElement = (
    content: string,
    elementStyle: Style_attributes = {},
    fallbackKey: keyof typeof DEFAULT_POSITIONS,
    styleOverrides: {
        fontFamily?: string;
        fontSize?: number;
        fontWeight?: string;
        color?: string;
        textAlign?: "left" | "center" | "right" | "justify";
        lineHeight?: number;
    }
) => {
    const fallback = DEFAULT_POSITIONS[fallbackKey];
    const posX = elementStyle.x ?? fallback.x;
    const posY = elementStyle.y ?? fallback.y;
    const posW = elementStyle.width ?? fallback.width;
    const posH = elementStyle.height ?? fallback.height;

    const align = styleOverrides.textAlign || elementStyle.align || "center";

    const style: React.CSSProperties = {
        position: "absolute",
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${posW}px`,
        height: `${posH}px`,
        fontFamily: styleOverrides.fontFamily || elementStyle.fontFamily || "sans-serif",
        fontSize: styleOverrides.fontSize
            ? `${styleOverrides.fontSize}px`
            : elementStyle.fontSize
                ? `${elementStyle.fontSize}px`
                : "16px",
        fontWeight: (styleOverrides.fontWeight || elementStyle.fontWeight || "normal") as React.CSSProperties["fontWeight"],
        color: styleOverrides.color || elementStyle.color || "#000000",
        lineHeight: styleOverrides.lineHeight || elementStyle.lineHeight || 1.2,
        textAlign: align as React.CSSProperties["textAlign"],
        display: "flex",
        alignItems: "center",
        justifyContent:
            align === "center"
                ? "center"
                : align === "right"
                    ? "flex-end"
                    : "flex-start",
        boxSizing: "border-box",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    };

    return (
        <div key={elementStyle.id || fallbackKey} style={style}>
            {content}
        </div>
    );
};

// Helper for rendering images with fallback coordinates
const renderImageElement = (
    src: string | undefined,
    elementStyle: Style_attributes = {},
    fallbackKey: keyof typeof DEFAULT_POSITIONS,
    altText: string
) => {
    if (!src) return null;

    const fallback = DEFAULT_POSITIONS[fallbackKey];
    const posX = elementStyle.x ?? fallback.x;
    const posY = elementStyle.y ?? fallback.y;
    const posW = elementStyle.width ?? fallback.width;
    const posH = elementStyle.height ?? fallback.height;

    const style: React.CSSProperties = {
        position: "absolute",
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${posW}px`,
        height: `${posH}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    return (
        <div key={elementStyle.id || fallbackKey} style={style}>
            <img
                src={src}
                alt={altText}
                onError={(e) => {
                    // Hide image wrapper if link breaks/fails to load
                    (e.target as HTMLElement).style.display = "none";
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                }}
            />
        </div>
    );
};

// Main Componentexport function Certificate({
export function extractStylingOptions(
    template?: Partial<CertificateTemplate> | null,
    customOverrides?: Partial<styling_options>
): styling_options {
    const defaultStylingOptions: styling_options = {
        primary_color: "#1A365D",
        secondary_color: "#D69E2E",
        border_color: "#1A365D",
        border_size: 4,
        border_style: "solid",
        date_text_color: "#4A5568",
        signature_color: "#2D3748",
        logo: "https://via.placeholder.com/120x60?text=Logo",

        heading_of_certificate: "CERTIFICATE OF APPRECIATION",
        title: "THIS IS PROUDLY PRESENTED TO",
        name: "Alex Morgan",
        achievement_statement:
            "For outstanding dedication, performance, and valuable contributions to the successful completion of the annual project.",
        issuer_name: "Jane Doe",
        issuer_designation: "Director of Operations",
        date: "July 25, 2026",
        signature_of_issuer: "https://via.placeholder.com/150x50?text=Signature",

        heading_font_family: "Georgia, serif",
        heading_font_size: 32,
        heading_font_weight: "bold",
        heading_color: "#1A365D",
        heading_text_align: "center",

        title_font_family: "Arial, sans-serif",
        title_font_size: 14,
        title_font_weight: "normal",
        title_color: "#718096",
        title_text_align: "center",

        name_font_family: "Georgia, serif",
        name_font_size: 28,
        name_font_weight: "bold",
        name_color: "#D69E2E",
        name_text_align: "center",

        achievement_font_family: "Arial, sans-serif",
        achievement_font_size: 14,
        achievement_font_weight: "normal",
        achievement_color: "#2D3748",
        achievement_line_height: 1.6,
        achievement_text_align: "center",

        date_font_family: "Arial, sans-serif",
        date_font_size: 12,
        date_font_weight: "normal",

        issuer_name_font_family: "Arial, sans-serif",
        issuer_name_font_size: 16,
        issuer_name_font_weight: "bold",
        issuer_name_color: "#1A365D",

        issuer_designation_font_family: "Arial, sans-serif",
        issuer_designation_font_size: 12,
        issuer_designation_font_weight: "normal",
        issuer_designation_color: "#718096",
    };

    if (!template) {
        return { ...defaultStylingOptions, ...customOverrides };
    }

    // Extract structured properties if present in the template
    const mappedFromTemplate: Partial<styling_options> = {
        // Theme & Frame
        primary_color: template.primary_color ?? defaultStylingOptions.primary_color,
        secondary_color: template.secondary_color ?? defaultStylingOptions.secondary_color,
        border_color: template.border_color ?? defaultStylingOptions.border_color,
        border_size: template.border_size ?? defaultStylingOptions.border_size,
        border_style: template.border_style ?? defaultStylingOptions.border_style,
        logo: template.logo_src || defaultStylingOptions.logo,

        // Heading
        heading_of_certificate: template.heading_content ?? defaultStylingOptions.heading_of_certificate,
        heading_font_family: template.heading_styling?.fontFamily ?? defaultStylingOptions.heading_font_family,
        heading_font_size: template.heading_styling?.fontSize ?? defaultStylingOptions.heading_font_size,
        heading_font_weight: template.heading_styling?.fontWeight ?? defaultStylingOptions.heading_font_weight,
        heading_color: template.heading_styling?.color ?? defaultStylingOptions.heading_color,
        heading_text_align: (template.heading_styling?.align as any) ?? defaultStylingOptions.heading_text_align,

        // Title
        title: template.title_content ?? defaultStylingOptions.title,
        title_font_family: template.title_styling?.fontFamily ?? defaultStylingOptions.title_font_family,
        title_font_size: template.title_styling?.fontSize ?? defaultStylingOptions.title_font_size,
        title_font_weight: template.title_styling?.fontWeight ?? defaultStylingOptions.title_font_weight,
        title_color: template.title_styling?.color ?? defaultStylingOptions.title_color,
        title_text_align: (template.title_styling?.align as any) ?? defaultStylingOptions.title_text_align,

        // Name
        name: template.name_content ?? defaultStylingOptions.name,
        name_font_family: template.name_styling?.fontFamily ?? defaultStylingOptions.name_font_family,
        name_font_size: template.name_styling?.fontSize ?? defaultStylingOptions.name_font_size,
        name_font_weight: template.name_styling?.fontWeight ?? defaultStylingOptions.name_font_weight,
        name_color: template.name_styling?.color ?? defaultStylingOptions.name_color,
        name_text_align: (template.name_styling?.align as any) ?? defaultStylingOptions.name_text_align,

        // Achievement
        achievement_statement: template.achievement_content ?? defaultStylingOptions.achievement_statement,
        achievement_font_family: template.achievement_styling?.fontFamily ?? defaultStylingOptions.achievement_font_family,
        achievement_font_size: template.achievement_styling?.fontSize ?? defaultStylingOptions.achievement_font_size,
        achievement_font_weight: template.achievement_styling?.fontWeight ?? defaultStylingOptions.achievement_font_weight,
        achievement_color: template.achievement_styling?.color ?? defaultStylingOptions.achievement_color,
        achievement_line_height: template.achievement_styling?.lineHeight ?? defaultStylingOptions.achievement_line_height,
        achievement_text_align: (template.achievement_styling?.align as any) ?? defaultStylingOptions.achievement_text_align,

        // Date
        date: template.date_content ?? defaultStylingOptions.date,
        date_font_family: template.date_styling?.fontFamily ?? defaultStylingOptions.date_font_family,
        date_font_size: template.date_styling?.fontSize ?? defaultStylingOptions.date_font_size,
        date_font_weight: template.date_styling?.fontWeight ?? defaultStylingOptions.date_font_weight,
        date_text_color: template.date_styling?.color ?? defaultStylingOptions.date_text_color,

        // Issuer
        issuer_name: template.issuer_name_content ?? defaultStylingOptions.issuer_name,
        issuer_name_font_family: template.issuer_name_styling?.fontFamily ?? defaultStylingOptions.issuer_name_font_family,
        issuer_name_font_size: template.issuer_name_styling?.fontSize ?? defaultStylingOptions.issuer_name_font_size,
        issuer_name_font_weight: template.issuer_name_styling?.fontWeight ?? defaultStylingOptions.issuer_name_font_weight,
        issuer_name_color: template.issuer_name_styling?.color ?? defaultStylingOptions.issuer_name_color,

        issuer_designation: template.issuer_designation_content ?? defaultStylingOptions.issuer_designation,
        issuer_designation_font_family: template.issuer_designation_styling?.fontFamily ?? defaultStylingOptions.issuer_designation_font_family,
        issuer_designation_font_size: template.issuer_designation_styling?.fontSize ?? defaultStylingOptions.issuer_designation_font_size,
        issuer_designation_font_weight: template.issuer_designation_styling?.fontWeight ?? defaultStylingOptions.issuer_designation_font_weight,
        issuer_designation_color: template.issuer_designation_styling?.color ?? defaultStylingOptions.issuer_designation_color,

        signature_of_issuer: template.signature_src || defaultStylingOptions.signature_of_issuer,
    };

    return {
        ...defaultStylingOptions,
        ...mappedFromTemplate,
        ...(template as any)?.styling, // Also supports nested `.styling` key if present
        ...customOverrides,
    };
}

// --- Main Panel Component ---

export default function MakingTemplateUi({
    initialTemplate,
    save_template,
}: {
    initialTemplate: CertificateTemplate;
    save_template: (template: CertificateTemplate) => Promise<void>;
}) {
    const [template, setTemplate] = useState<CertificateTemplate>(initialTemplate);

    const [template_styling, setTemplateStyling] = useState<styling_options>(() =>
        extractStylingOptions(initialTemplate)
    );
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    // Sync template_styling back into template so the saved object always carries the latest styling
    useEffect(() => {
         <Certificate cert_template={template} template_styling={template_styling} />
    }, [template_styling]);

    const handleStyleChange = (key: keyof styling_options, value: any) => {
        setTemplateStyling((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {

            await save_template(template);
        } catch (error) {
            console.error("Failed to save template:", error);
        } finally {
            setIsSaving(false);
        }
    };


    function Certificate({
        cert_template,
        template_styling,
    }: {
        cert_template: CertificateTemplate;
        template_styling: styling_options;
    }) {
        // 1. Initialize and mutate template properties using template_styling
        const updatedTemplate: CertificateTemplate = {
            ...cert_template,

            // Canvas & Frame Updates
            primary_color: template_styling.primary_color,
            secondary_color: template_styling.secondary_color,
            border_color: template_styling.border_color,
            border_size: template_styling.border_size,
            border_style: template_styling.border_style,
            logo_src: template_styling.logo,
            canvas: {
                ...cert_template.canvas,
                background: template_styling.primary_color || "#ffffff",
            },

            // Heading Updates
            heading_content: template_styling.heading_of_certificate,
            heading_styling: {
                ...cert_template.heading_styling,
                fontFamily: template_styling.heading_font_family || cert_template.heading_styling?.fontFamily,
                fontSize: template_styling.heading_font_size ?? cert_template.heading_styling?.fontSize,
                fontWeight: template_styling.heading_font_weight || cert_template.heading_styling?.fontWeight,
                color: template_styling.heading_color || template_styling.secondary_color || cert_template.heading_styling?.color,
                align: template_styling.heading_text_align || cert_template.heading_styling?.align,
            },

            // Title Updates
            title_content: template_styling.title || cert_template.title_content,
            title_styling: {
                ...cert_template.title_styling,
                fontFamily: template_styling.title_font_family || cert_template.title_styling?.fontFamily,
                fontSize: template_styling.title_font_size ?? cert_template.title_styling?.fontSize,
                fontWeight: template_styling.title_font_weight || cert_template.title_styling?.fontWeight,
                color: template_styling.title_color || cert_template.title_styling?.color,
                align: template_styling.title_text_align || cert_template.title_styling?.align,
            },

            // Recipient Name Updates
            name_content: template_styling.name || cert_template.name_content,
            name_styling: {
                ...cert_template.name_styling,
                fontFamily: template_styling.name_font_family || cert_template.name_styling?.fontFamily,
                fontSize: template_styling.name_font_size ?? cert_template.name_styling?.fontSize,
                fontWeight: template_styling.name_font_weight || cert_template.name_styling?.fontWeight,
                color: template_styling.name_color || template_styling.secondary_color || cert_template.name_styling?.color,
                align: template_styling.name_text_align || cert_template.name_styling?.align,
            },

            // Achievement Body Updates
            achievement_content: template_styling.achievement_statement || cert_template.achievement_content,
            achievement_styling: {
                ...cert_template.achievement_styling,
                fontFamily: template_styling.achievement_font_family || cert_template.achievement_styling?.fontFamily,
                fontSize: template_styling.achievement_font_size ?? cert_template.achievement_styling?.fontSize,
                fontWeight: template_styling.achievement_font_weight || cert_template.achievement_styling?.fontWeight,
                color: template_styling.achievement_color || cert_template.achievement_styling?.color,
                lineHeight: template_styling.achievement_line_height ?? cert_template.achievement_styling?.lineHeight,
                align: template_styling.achievement_text_align || cert_template.achievement_styling?.align,
            },

            // Date Updates
            date_content: template_styling.date || cert_template.date_content,
            date_styling: {
                ...cert_template.date_styling,
                fontFamily: template_styling.date_font_family || cert_template.date_styling?.fontFamily,
                fontSize: template_styling.date_font_size ?? cert_template.date_styling?.fontSize,
                fontWeight: template_styling.date_font_weight || cert_template.date_styling?.fontWeight,
                color: template_styling.date_text_color || cert_template.date_styling?.color,
            },

            // Issuer Name Updates
            issuer_name_content: template_styling.issuer_name || cert_template.issuer_name_content,
            issuer_name_styling: {
                ...cert_template.issuer_name_styling,
                fontFamily: template_styling.issuer_name_font_family || cert_template.issuer_name_styling?.fontFamily,
                fontSize: template_styling.issuer_name_font_size ?? cert_template.issuer_name_styling?.fontSize,
                fontWeight: template_styling.issuer_name_font_weight || cert_template.issuer_name_styling?.fontWeight,
                color: template_styling.issuer_name_color || cert_template.issuer_name_styling?.color,
            },

            // Issuer Designation Updates
            issuer_designation_content: template_styling.issuer_designation || cert_template.issuer_designation_content,
            issuer_designation_styling: {
                ...cert_template.issuer_designation_styling,
                fontFamily: template_styling.issuer_designation_font_family || cert_template.issuer_designation_styling?.fontFamily,
                fontSize: template_styling.issuer_designation_font_size ?? cert_template.issuer_designation_styling?.fontSize,
                fontWeight: template_styling.issuer_designation_font_weight || cert_template.issuer_designation_styling?.fontWeight,
                color: template_styling.issuer_designation_color || cert_template.issuer_designation_styling?.color,
            },

            // Signature Image Updates
            signature_src: template_styling.signature_of_issuer || cert_template.signature_src,
            signature_styling: {
                ...cert_template.signature_styling,
            },
        };
        setTemplate(updatedTemplate)
        // 2. Setup canvas styles directly from the updatedTemplate properties
        const canvasWidth = updatedTemplate.canvas?.width || 700;
        const canvasHeight = updatedTemplate.canvas?.height || 500;

        const canvasStyle: React.CSSProperties = {
            position: "relative",
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            background: updatedTemplate.canvas.background,
            border: `${updatedTemplate.border_size}px ${updatedTemplate.border_style} ${updatedTemplate.border_color}`,
            boxSizing: "border-box",
            overflow: "hidden",
        };

        // 3. Render directly using updatedTemplate values
        return (
            <div className="certificate-canvas shadow-2xl rounded-sm" style={canvasStyle}>
                {/* 1. Logo */}
                {renderImageElement(
                    updatedTemplate.logo_src,
                    {},
                    "logo",
                    "Logo"
                )}

                {/* 2. Certificate Heading */}
                {renderTextElement(
                    updatedTemplate.heading_content,
                    updatedTemplate.heading_styling,
                    "heading",
                    {
                        fontFamily: updatedTemplate.heading_styling.fontFamily,
                        fontSize: updatedTemplate.heading_styling.fontSize,
                        fontWeight: updatedTemplate.heading_styling.fontWeight,
                        color: updatedTemplate.heading_styling.color,
                        textAlign: updatedTemplate.heading_styling.align,
                    }
                )}

                {/* 3. Title */}
                {renderTextElement(
                    updatedTemplate.title_content,
                    updatedTemplate.title_styling,
                    "title",
                    {
                        fontFamily: updatedTemplate.title_styling.fontFamily,
                        fontSize: updatedTemplate.title_styling.fontSize,
                        fontWeight: updatedTemplate.title_styling.fontWeight,
                        color: updatedTemplate.title_styling.color,
                        textAlign: updatedTemplate.title_styling.align,
                    }
                )}

                {/* 4. Recipient Name */}
                {renderTextElement(
                    updatedTemplate.name_content,
                    updatedTemplate.name_styling,
                    "name",
                    {
                        fontFamily: updatedTemplate.name_styling.fontFamily,
                        fontSize: updatedTemplate.name_styling.fontSize,
                        fontWeight: updatedTemplate.name_styling.fontWeight,
                        color: updatedTemplate.name_styling.color,
                        textAlign: updatedTemplate.name_styling.align,
                    }
                )}

                {/* 5. Achievement Body */}
                {renderTextElement(
                    updatedTemplate.achievement_content,
                    updatedTemplate.achievement_styling,
                    "achievement",
                    {
                        fontFamily: updatedTemplate.achievement_styling.fontFamily,
                        fontSize: updatedTemplate.achievement_styling.fontSize,
                        fontWeight: updatedTemplate.achievement_styling.fontWeight,
                        color: updatedTemplate.achievement_styling.color,
                        lineHeight: updatedTemplate.achievement_styling.lineHeight,
                        textAlign: updatedTemplate.achievement_styling.align,
                    }
                )}

                {/* 6. Date */}
                {renderTextElement(
                    updatedTemplate.date_content,
                    updatedTemplate.date_styling,
                    "date",
                    {
                        fontFamily: updatedTemplate.date_styling.fontFamily,
                        fontSize: updatedTemplate.date_styling.fontSize,
                        fontWeight: updatedTemplate.date_styling.fontWeight,
                        color: updatedTemplate.date_styling.color,
                    }
                )}

                {/* 7. Issuer Name */}
                {renderTextElement(
                    updatedTemplate.issuer_name_content,
                    updatedTemplate.issuer_name_styling,
                    "issuer_name",
                    {
                        fontFamily: updatedTemplate.issuer_name_styling.fontFamily,
                        fontSize: updatedTemplate.issuer_name_styling.fontSize,
                        fontWeight: updatedTemplate.issuer_name_styling.fontWeight,
                        color: updatedTemplate.issuer_name_styling.color,
                    }
                )}

                {/* 8. Issuer Designation */}
                {renderTextElement(
                    updatedTemplate.issuer_designation_content,
                    updatedTemplate.issuer_designation_styling,
                    "issuer_designation",
                    {
                        fontFamily: updatedTemplate.issuer_designation_styling.fontFamily,
                        fontSize: updatedTemplate.issuer_designation_styling.fontSize,
                        fontWeight: updatedTemplate.issuer_designation_styling.fontWeight,
                        color: updatedTemplate.issuer_designation_styling.color,
                    }
                )}

                {/* 9. Signature */}
                {renderImageElement(
                    updatedTemplate.signature_src,
                    updatedTemplate.signature_styling,
                    "signature",
                    "Signature"
                )}
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-stone-100 text-stone-800 overflow-hidden font-sans">
            {/* Sidebar Customizer Panel */}
            <aside className="w-96 border-r border-stone-200 bg-white flex flex-col h-full shadow-lg z-10">
                <header className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Certificate Customizer</h2>
                        <p className="text-xs text-stone-500">Customize styling & default content</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-xs font-semibold shadow transition"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* SECTION 1: Theme & Frame Colors */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Frame & Theme Styling
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Primary Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={template_styling.primary_color}
                                        onChange={(e) => handleStyleChange("primary_color", e.target.value)}
                                        className="w-8 h-8 rounded border border-stone-300 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono">{template_styling.primary_color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Secondary Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={template_styling.secondary_color}
                                        onChange={(e) => handleStyleChange("secondary_color", e.target.value)}
                                        className="w-8 h-8 rounded border border-stone-300 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono">{template_styling.secondary_color}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Border Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={template_styling.border_color}
                                        onChange={(e) => handleStyleChange("border_color", e.target.value)}
                                        className="w-8 h-8 rounded border border-stone-300 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono">{template_styling.border_color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Border Size (px)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={template_styling.border_size}
                                    onChange={(e) => handleStyleChange("border_size", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-700">Border Style</label>
                            <select
                                value={template_styling.border_style}
                                onChange={(e) => handleStyleChange("border_style", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                                <option value="double">Double</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-700">Logo URL</label>
                            <input
                                type="text"
                                value={template_styling.logo}
                                onChange={(e) => handleStyleChange("logo", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </section>

                    {/* SECTION 2: Certificate Heading */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Certificate Heading
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Heading Text</label>
                            <input
                                type="text"
                                value={template_styling.heading_of_certificate}
                                onChange={(e) => handleStyleChange("heading_of_certificate", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select
                                    value={template_styling.heading_font_family}
                                    onChange={(e) => handleStyleChange("heading_font_family", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {FONT_OPTIONS.map((f) => (
                                        <option key={f} value={f}>{f.split(",")[0]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input
                                    type="number"
                                    value={template_styling.heading_font_size || 32}
                                    onChange={(e) => handleStyleChange("heading_font_size", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Weight</label>
                                <select
                                    value={template_styling.heading_font_weight || "bold"}
                                    onChange={(e) => handleStyleChange("heading_font_weight", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {WEIGHT_OPTIONS.map((w) => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Align</label>
                                <select
                                    value={template_styling.heading_text_align || "center"}
                                    onChange={(e) => handleStyleChange("heading_text_align", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input
                                    type="color"
                                    value={template_styling.heading_color || template_styling.primary_color}
                                    onChange={(e) => handleStyleChange("heading_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: Title */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Title Statement
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Title Text</label>
                            <input
                                type="text"
                                value={template_styling.title}
                                onChange={(e) => handleStyleChange("title", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select
                                    value={template_styling.title_font_family}
                                    onChange={(e) => handleStyleChange("title_font_family", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {FONT_OPTIONS.map((f) => (
                                        <option key={f} value={f}>{f.split(",")[0]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input
                                    type="number"
                                    value={template_styling.title_font_size || 14}
                                    onChange={(e) => handleStyleChange("title_font_size", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Align</label>
                                <select
                                    value={template_styling.title_text_align || "center"}
                                    onChange={(e) => handleStyleChange("title_text_align", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input
                                    type="color"
                                    value={template_styling.title_color || "#718096"}
                                    onChange={(e) => handleStyleChange("title_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 4: Recipient Name */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Recipient Name
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Default Name</label>
                            <input
                                type="text"
                                value={template_styling.name}
                                onChange={(e) => handleStyleChange("name", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select
                                    value={template_styling.name_font_family}
                                    onChange={(e) => handleStyleChange("name_font_family", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {FONT_OPTIONS.map((f) => (
                                        <option key={f} value={f}>{f.split(",")[0]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input
                                    type="number"
                                    value={template_styling.name_font_size || 28}
                                    onChange={(e) => handleStyleChange("name_font_size", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Weight</label>
                                <select
                                    value={template_styling.name_font_weight || "bold"}
                                    onChange={(e) => handleStyleChange("name_font_weight", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {WEIGHT_OPTIONS.map((w) => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input
                                    type="color"
                                    value={template_styling.name_color || template_styling.secondary_color}
                                    onChange={(e) => handleStyleChange("name_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 5: Achievement Statement */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Achievement Body
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Statement Text</label>
                            <textarea
                                rows={3}
                                value={template_styling.achievement_statement}
                                onChange={(e) => handleStyleChange("achievement_statement", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select
                                    value={template_styling.achievement_font_family}
                                    onChange={(e) => handleStyleChange("achievement_font_family", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {FONT_OPTIONS.map((f) => (
                                        <option key={f} value={f}>{f.split(",")[0]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input
                                    type="number"
                                    value={template_styling.achievement_font_size || 14}
                                    onChange={(e) => handleStyleChange("achievement_font_size", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Line Height</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={template_styling.achievement_line_height || 1.6}
                                    onChange={(e) => handleStyleChange("achievement_line_height", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input
                                    type="color"
                                    value={template_styling.achievement_color || "#2D3748"}
                                    onChange={(e) => handleStyleChange("achievement_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 6: Date */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Date Field
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Date Text</label>
                            <input
                                type="text"
                                value={template_styling.date}
                                onChange={(e) => handleStyleChange("date", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size</label>
                                <input
                                    type="number"
                                    value={template_styling.date_font_size || 12}
                                    onChange={(e) => handleStyleChange("date_font_size", Number(e.target.value))}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Weight</label>
                                <select
                                    value={template_styling.date_font_weight || "normal"}
                                    onChange={(e) => handleStyleChange("date_font_weight", e.target.value)}
                                    className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white"
                                >
                                    {WEIGHT_OPTIONS.map((w) => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input
                                    type="color"
                                    value={template_styling.date_text_color || "#4A5568"}
                                    onChange={(e) => handleStyleChange("date_text_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECTION 7: Issuer Details */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">
                            Issuer Details & Signature
                        </h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Issuer Name</label>
                            <input
                                type="text"
                                value={template_styling.issuer_name}
                                onChange={(e) => handleStyleChange("issuer_name", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Issuer Designation</label>
                            <input
                                type="text"
                                value={template_styling.issuer_designation}
                                onChange={(e) => handleStyleChange("issuer_designation", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Signature URL</label>
                            <input
                                type="text"
                                value={template_styling.signature_of_issuer}
                                onChange={(e) => handleStyleChange("signature_of_issuer", e.target.value)}
                                className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Issuer Name Color</label>
                                <input
                                    type="color"
                                    value={template_styling.issuer_name_color || template_styling.primary_color}
                                    onChange={(e) => handleStyleChange("issuer_name_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Designation Color</label>
                                <input
                                    type="color"
                                    value={template_styling.issuer_designation_color || "#718096"}
                                    onChange={(e) => handleStyleChange("issuer_designation_color", e.target.value)}
                                    className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </aside>

            {/* Main Canvas Workspace */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto bg-stone-200">
                <div className="bg-white p-4 rounded-xl shadow-xl border border-stone-300 flex items-center justify-center">
                    <Certificate cert_template={template} template_styling={template_styling} />
                </div>
            </main>
        </div>
    );
}

function ImagePlaceholderIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
    );
}