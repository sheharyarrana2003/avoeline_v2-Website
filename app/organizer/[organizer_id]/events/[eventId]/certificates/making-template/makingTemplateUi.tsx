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

// Main Component
export function Certificate({
  template,
  template_styling,
}: {
  template: CertificateTemplate;
  template_styling: styling_options;
}) {
  const canvasWidth = template.canvas?.width || 700;
  const canvasHeight = template.canvas?.height || 500;

  const canvasStyle: React.CSSProperties = {
    position: "relative",
    width: `${canvasWidth}px`,
    height: `${canvasHeight}px`,
    background: template.canvas?.background || "#ffffff",
    border: `${template_styling.border_size ?? 4}px ${template_styling.border_style || "solid"} ${template_styling.border_color || "#1A365D"}`,
    boxSizing: "border-box",
    overflow: "hidden",
  };

  return (
    <div className="certificate-canvas shadow-2xl rounded-sm" style={canvasStyle}>
      {/* 1. Logo */}
      {renderImageElement(
        template_styling.logo || template.logo_src,
        {},
        "logo",
        "Logo"
      )}

      {/* 2. Certificate Heading */}
      {renderTextElement(
        template_styling.heading_of_certificate || template.heading_content,
        template.heading_styling,
        "heading",
        {
          fontFamily: template_styling.heading_font_family,
          fontSize: template_styling.heading_font_size,
          fontWeight: template_styling.heading_font_weight,
          color: template_styling.heading_color || template_styling.primary_color,
          textAlign: template_styling.heading_text_align,
        }
      )}

      {/* 3. Title */}
      {renderTextElement(
        template_styling.title || template.title_content,
        template.title_styling,
        "title",
        {
          fontFamily: template_styling.title_font_family,
          fontSize: template_styling.title_font_size,
          fontWeight: template_styling.title_font_weight,
          color: template_styling.title_color,
          textAlign: template_styling.title_text_align,
        }
      )}

      {/* 4. Recipient Name */}
      {renderTextElement(
        template_styling.name || template.name_content,
        template.name_styling,
        "name",
        {
          fontFamily: template_styling.name_font_family,
          fontSize: template_styling.name_font_size,
          fontWeight: template_styling.name_font_weight,
          color: template_styling.name_color || template_styling.secondary_color,
          textAlign: template_styling.name_text_align,
        }
      )}

      {/* 5. Achievement Body */}
      {renderTextElement(
        template_styling.achievement_statement || template.achievement_content,
        template.achievement_styling,
        "achievement",
        {
          fontFamily: template_styling.achievement_font_family,
          fontSize: template_styling.achievement_font_size,
          fontWeight: template_styling.achievement_font_weight,
          color: template_styling.achievement_color,
          lineHeight: template_styling.achievement_line_height,
          textAlign: template_styling.achievement_text_align,
        }
      )}

      {/* 6. Date */}
      {renderTextElement(
        template_styling.date || template.date_content,
        template.date_styling,
        "date",
        {
          fontFamily: template_styling.date_font_family,
          fontSize: template_styling.date_font_size,
          fontWeight: template_styling.date_font_weight,
          color: template_styling.date_text_color,
        }
      )}

      {/* 7. Issuer Name */}
      {renderTextElement(
        template_styling.issuer_name || template.issuer_name_content,
        template.issuer_name_styling,
        "issuer_name",
        {
          fontFamily: template_styling.issuer_name_font_family,
          fontSize: template_styling.issuer_name_font_size,
          fontWeight: template_styling.issuer_name_font_weight,
          color: template_styling.issuer_name_color || template_styling.primary_color,
        }
      )}

      {/* 8. Issuer Designation */}
      {renderTextElement(
        template_styling.issuer_designation || template.issuer_designation_content,
        template.issuer_designation_styling,
        "issuer_designation",
        {
          fontFamily: template_styling.issuer_designation_font_family,
          fontSize: template_styling.issuer_designation_font_size,
          fontWeight: template_styling.issuer_designation_font_weight,
          color: template_styling.issuer_designation_color,
        }
      )}

      {/* 9. Signature */}
      {renderImageElement(
        template_styling.signature_of_issuer || template.signature_src,
        template.signature_styling,
        "signature",
        "Signature"
      )}
    </div>
  );
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

    // Initialize styling from template if it already has styling data, otherwise use defaults
    const [template_styling, setTemplateStyling] = useState<styling_options>(() => {
        const existing = (initialTemplate as any)?.styling;
        return existing ? { ...defaultStylingOptions, ...existing } : defaultStylingOptions;
    });

    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    // Sync template_styling back into template so the saved object always carries the latest styling
    useEffect(() => {
        setTemplate((prev) => ({
            ...prev,
            styling: template_styling,
        } as CertificateTemplate));
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
                    <Certificate template={template} template_styling={template_styling} />
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