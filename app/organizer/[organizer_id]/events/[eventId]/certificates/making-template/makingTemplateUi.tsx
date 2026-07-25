'use client'

import { CertificateTemplate, Style_attributes, Blockchain, Canvas } from "@/src/services/certificate.template.services";
import { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation'



// --- Defaults ---

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

const DEFAULT_TEMPLATE: CertificateTemplate = {
    templateId: "",
    organizer_id: "",
    templateName: "Untitled Template",
    canvas: { width: 700, height: 500, showGrid: false },
    blockchain: { enabled: false, network: "ethereum" },

    primary_color: "#1A365D",
    secondary_color: "#D69E2E",
    border_color: "#1A365D",
    border_size: 4,
    border_style: "solid",

    logo_src: "https://via.placeholder.com/120x60?text=Logo",
    logo_styling: { x: 290, y: 20, width: 120, height: 60 },

    heading_content: "CERTIFICATE OF APPRECIATION",
    heading_styling: { x: 100, y: 100, width: 500, height: 50, fontFamily: "Georgia, serif", fontSize: 32, fontWeight: "bold", color: "#1A365D", align: "center" },

    title_content: "THIS IS PROUDLY PRESENTED TO",
    title_styling: { x: 150, y: 170, width: 400, height: 24, fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: "normal", color: "#718096", align: "center" },

    name_content: "Alex Morgan",
    name_styling: { x: 100, y: 210, width: 500, height: 48, fontFamily: "Georgia, serif", fontSize: 28, fontWeight: "bold", color: "#D69E2E", align: "center" },

    achievement_content: "For outstanding dedication, performance, and valuable contributions to the successful completion of the annual project.",
    achievement_styling: { x: 100, y: 270, width: 500, height: 80, fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: "normal", color: "#2D3748", align: "center", lineHeight: 1.6 },

    date_content: "July 25, 2026",
    date_styling: { x: 80, y: 420, width: 180, height: 24, fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: "normal", color: "#4A5568", align: "left" },

    issuer_name_content: "Jane Doe",
    issuer_name_styling: { x: 420, y: 400, width: 200, height: 28, fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: "bold", color: "#1A365D", align: "center" },

    issuer_designation_content: "Director of Operations",
    issuer_designation_styling: { x: 420, y: 430, width: 200, height: 20, fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: "normal", color: "#718096", align: "center" },

    signature_src: "https://via.placeholder.com/150x50?text=Signature",
    signature_styling: { x: 445, y: 340, width: 150, height: 50 },
};

// --- Render Helpers ---

const renderTextElement = (
    content: string,
    styleAttr: Style_attributes,
    fallbackKey: string
) => {
    const style: React.CSSProperties = {
        position: "absolute",
        left: `${styleAttr.x ?? 0}px`,
        top: `${styleAttr.y ?? 0}px`,
        width: `${styleAttr.width ?? 200}px`,
        height: `${styleAttr.height ?? 40}px`,
        fontFamily: styleAttr.fontFamily || "sans-serif",
        fontSize: styleAttr.fontSize ? `${styleAttr.fontSize}px` : "16px",
        fontWeight: (styleAttr.fontWeight || "normal") as React.CSSProperties["fontWeight"],
        color: styleAttr.color || "#000000",
        lineHeight: styleAttr.lineHeight || 1.2,
        textAlign: (styleAttr.align || "center") as React.CSSProperties["textAlign"],
        display: "flex",
        alignItems: "center",
        justifyContent:
            styleAttr.align === "center"
                ? "center"
                : styleAttr.align === "right"
                    ? "flex-end"
                    : "flex-start",
        boxSizing: "border-box",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    };

    return (
        <div key={fallbackKey} style={style}>
            {content}
        </div>
    );
};

const renderImageElement = (
    src: string,
    styleAttr: Style_attributes,
    fallbackKey: string,
    alt: string
) => {
    if (!src) return null;
    const style: React.CSSProperties = {
        position: "absolute",
        left: `${styleAttr.x ?? 0}px`,
        top: `${styleAttr.y ?? 0}px`,
        width: `${styleAttr.width ?? 100}px`,
        height: `${styleAttr.height ?? 50}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    return (
        <div key={fallbackKey} style={style}>
            <img
                src={src}
                alt={alt}
                onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
        </div>
    );
};

// --- Certificate Preview ---

function Certificate({ template }: { template: CertificateTemplate }) {
    const canvasStyle: React.CSSProperties = {
        position: "relative",
        width: `${template.canvas.width}px`,
        height: `${template.canvas.height}px`,
        background:  template.primary_color || "#ffffff",
        border: `${template.border_size}px ${template.border_style} ${template.border_color}`,
        boxSizing: "border-box",
        overflow: "hidden",
    };

    return (
        <div className="certificate-canvas shadow-2xl rounded-sm" style={canvasStyle}>
            {renderImageElement(template.logo_src, template.logo_styling, "logo", "Logo")}
            {renderTextElement(template.heading_content, template.heading_styling, "heading")}
            {renderTextElement(template.title_content, template.title_styling, "title")}
            {renderTextElement(template.name_content, template.name_styling, "name")}
            {renderTextElement(template.achievement_content, template.achievement_styling, "achievement")}
            {renderTextElement(template.date_content, template.date_styling, "date")}
            {renderTextElement(template.issuer_name_content, template.issuer_name_styling, "issuer_name")}
            {renderTextElement(template.issuer_designation_content, template.issuer_designation_styling, "issuer_designation")}
            {renderImageElement(template.signature_src, template.signature_styling, "signature", "Signature")}
        </div>
    );
}

// --- Main Panel ---

export default function MakingTemplateUi({
    initialTemplate,
    save_template,
}: {
    initialTemplate: CertificateTemplate;
    save_template: (template: CertificateTemplate) => Promise<void>;
}) {
    const [template, setTemplate] = useState<CertificateTemplate>(() => ({
        ...DEFAULT_TEMPLATE,
        ...initialTemplate,
        canvas: { ...DEFAULT_TEMPLATE.canvas, ...initialTemplate.canvas },
        blockchain: { ...DEFAULT_TEMPLATE.blockchain, ...initialTemplate.blockchain },
        heading_styling: { ...DEFAULT_TEMPLATE.heading_styling, ...initialTemplate.heading_styling },
        title_styling: { ...DEFAULT_TEMPLATE.title_styling, ...initialTemplate.title_styling },
        name_styling: { ...DEFAULT_TEMPLATE.name_styling, ...initialTemplate.name_styling },
        achievement_styling: { ...DEFAULT_TEMPLATE.achievement_styling, ...initialTemplate.achievement_styling },
        date_styling: { ...DEFAULT_TEMPLATE.date_styling, ...initialTemplate.date_styling },
        issuer_name_styling: { ...DEFAULT_TEMPLATE.issuer_name_styling, ...initialTemplate.issuer_name_styling },
        issuer_designation_styling: { ...DEFAULT_TEMPLATE.issuer_designation_styling, ...initialTemplate.issuer_designation_styling },
        logo_styling: { ...DEFAULT_TEMPLATE.logo_styling, ...initialTemplate.logo_styling },
        signature_styling: { ...DEFAULT_TEMPLATE.signature_styling, ...initialTemplate.signature_styling },
    }));

    const [isSaving, setIsSaving] = useState(false);

    const setField = (key: keyof CertificateTemplate, value: any) =>
        setTemplate((prev) => ({ ...prev, [key]: value }));

    const setStyle = (styleKey: keyof CertificateTemplate, attr: keyof Style_attributes, value: any) =>
        setTemplate((prev) => ({
            ...prev,
            [styleKey]: { ...(prev as any)[styleKey], [attr]: value },
        }));

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
            {/* Sidebar */}
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

                <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-6">
                    {/* FRAME & THEME */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Frame & Theme</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Primary Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="color" value={template.primary_color} onChange={(e) => setField("primary_color", e.target.value)} className="w-8 h-8 rounded border border-stone-300 cursor-pointer" />
                                    <span className="text-xs font-mono">{template.primary_color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Secondary Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="color" value={template.secondary_color} onChange={(e) => setField("secondary_color", e.target.value)} className="w-8 h-8 rounded border border-stone-300 cursor-pointer" />
                                    <span className="text-xs font-mono">{template.secondary_color}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Border Color</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="color" value={template.border_color} onChange={(e) => setField("border_color", e.target.value)} className="w-8 h-8 rounded border border-stone-300 cursor-pointer" />
                                    <span className="text-xs font-mono">{template.border_color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Border Size (px)</label>
                                <input type="number" min={0} value={template.border_size} onChange={(e) => setField("border_size", Number(e.target.value))} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Border Style</label>
                            <select value={template.border_style} onChange={(e) => setField("border_style", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded bg-white">
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                                <option value="double">Double</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Logo URL</label>
                            <input type="text" value={template.logo_src} onChange={(e) => setField("logo_src", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Logo X</label>
                                <input type="number" value={template.logo_styling.x} onChange={(e) => setStyle("logo_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Logo Y</label>
                                <input type="number" value={template.logo_styling.y} onChange={(e) => setStyle("logo_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                            </div>
                        </div>
                    </section>

                    {/* HEADING */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Certificate Heading</h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Heading Text</label>
                            <input type="text" value={template.heading_content} onChange={(e) => setField("heading_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">X Position</label>
                                <input type="number" value={template.heading_styling.x} onChange={(e) => setStyle("heading_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Y Position</label>
                                <input type="number" value={template.heading_styling.y} onChange={(e) => setStyle("heading_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select value={template.heading_styling.fontFamily} onChange={(e) => setStyle("heading_styling", "fontFamily", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {FONT_OPTIONS.map((f) => (<option key={f} value={f}>{f.split(",")[0]}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input type="number" value={template.heading_styling.fontSize} onChange={(e) => setStyle("heading_styling", "fontSize", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Weight</label>
                                <select value={template.heading_styling.fontWeight} onChange={(e) => setStyle("heading_styling", "fontWeight", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {WEIGHT_OPTIONS.map((w) => (<option key={w} value={w}>{w}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Align</label>
                                <select value={template.heading_styling.align} onChange={(e) => setStyle("heading_styling", "align", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input type="color" value={template.heading_styling.color || template.primary_color} onChange={(e) => setStyle("heading_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                        </div>
                    </section>

                    {/* TITLE */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Title Statement</h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Title Text</label>
                            <input type="text" value={template.title_content} onChange={(e) => setField("title_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">X Position</label>
                                <input type="number" value={template.title_styling.x} onChange={(e) => setStyle("title_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Y Position</label>
                                <input type="number" value={template.title_styling.y} onChange={(e) => setStyle("title_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select value={template.title_styling.fontFamily} onChange={(e) => setStyle("title_styling", "fontFamily", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {FONT_OPTIONS.map((f) => (<option key={f} value={f}>{f.split(",")[0]}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input type="number" value={template.title_styling.fontSize} onChange={(e) => setStyle("title_styling", "fontSize", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Align</label>
                                <select value={template.title_styling.align} onChange={(e) => setStyle("title_styling", "align", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input type="color" value={template.title_styling.color} onChange={(e) => setStyle("title_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                        </div>
                    </section>

                    {/* NAME */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Recipient Name</h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Default Name</label>
                            <input type="text" value={template.name_content} onChange={(e) => setField("name_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">X Position</label>
                                <input type="number" value={template.name_styling.x} onChange={(e) => setStyle("name_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Y Position</label>
                                <input type="number" value={template.name_styling.y} onChange={(e) => setStyle("name_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select value={template.name_styling.fontFamily} onChange={(e) => setStyle("name_styling", "fontFamily", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {FONT_OPTIONS.map((f) => (<option key={f} value={f}>{f.split(",")[0]}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input type="number" value={template.name_styling.fontSize} onChange={(e) => setStyle("name_styling", "fontSize", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Weight</label>
                                <select value={template.name_styling.fontWeight} onChange={(e) => setStyle("name_styling", "fontWeight", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {WEIGHT_OPTIONS.map((w) => (<option key={w} value={w}>{w}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input type="color" value={template.name_styling.color || template.secondary_color} onChange={(e) => setStyle("name_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                        </div>
                    </section>

                    {/* ACHIEVEMENT */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Achievement Body</h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Statement Text</label>
                            <textarea rows={3} value={template.achievement_content} onChange={(e) => setField("achievement_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">X Position</label>
                                <input type="number" value={template.achievement_styling.x} onChange={(e) => setStyle("achievement_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Y Position</label>
                                <input type="number" value={template.achievement_styling.y} onChange={(e) => setStyle("achievement_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Family</label>
                                <select value={template.achievement_styling.fontFamily} onChange={(e) => setStyle("achievement_styling", "fontFamily", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {FONT_OPTIONS.map((f) => (<option key={f} value={f}>{f.split(",")[0]}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size (px)</label>
                                <input type="number" value={template.achievement_styling.fontSize} onChange={(e) => setStyle("achievement_styling", "fontSize", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Line Height</label>
                                <input type="number" step="0.1" value={template.achievement_styling.lineHeight} onChange={(e) => setStyle("achievement_styling", "lineHeight", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input type="color" value={template.achievement_styling.color} onChange={(e) => setStyle("achievement_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                        </div>
                    </section>

                    {/* DATE */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Date Field</h3>
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Date Text</label>
                            <input type="text" value={template.date_content} onChange={(e) => setField("date_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">X Position</label>
                                <input type="number" value={template.date_styling.x} onChange={(e) => setStyle("date_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Y Position</label>
                                <input type="number" value={template.date_styling.y} onChange={(e) => setStyle("date_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Font Size</label>
                                <input type="number" value={template.date_styling.fontSize} onChange={(e) => setStyle("date_styling", "fontSize", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Weight</label>
                                <select value={template.date_styling.fontWeight} onChange={(e) => setStyle("date_styling", "fontWeight", e.target.value)} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded bg-white">
                                    {WEIGHT_OPTIONS.map((w) => (<option key={w} value={w}>{w}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Color</label>
                                <input type="color" value={template.date_styling.color} onChange={(e) => setStyle("date_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                        </div>
                    </section>

                    {/* ISSUER */}
                    <section className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <h3 className="text-xs uppercase font-bold tracking-wider text-stone-600">Issuer Details & Signature</h3>
                        
                        <div>
                            <label className="block text-xs font-medium text-stone-700">Issuer Name</label>
                            <input type="text" value={template.issuer_name_content} onChange={(e) => setField("issuer_name_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Name X</label>
                                <input type="number" value={template.issuer_name_styling.x} onChange={(e) => setStyle("issuer_name_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Name Y</label>
                                <input type="number" value={template.issuer_name_styling.y} onChange={(e) => setStyle("issuer_name_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-700">Issuer Designation</label>
                            <input type="text" value={template.issuer_designation_content} onChange={(e) => setField("issuer_designation_content", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Designation X</label>
                                <input type="number" value={template.issuer_designation_styling.x} onChange={(e) => setStyle("issuer_designation_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Designation Y</label>
                                <input type="number" value={template.issuer_designation_styling.y} onChange={(e) => setStyle("issuer_designation_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-700">Signature URL</label>
                            <input type="text" value={template.signature_src} onChange={(e) => setField("signature_src", e.target.value)} className="mt-1 w-full text-xs p-1.5 border border-stone-300 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Signature X</label>
                                <input type="number" value={template.signature_styling.x} onChange={(e) => setStyle("signature_styling", "x", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Signature Y</label>
                                <input type="number" value={template.signature_styling.y} onChange={(e) => setStyle("signature_styling", "y", Number(e.target.value))} className="mt-1 w-full text-xs p-1 border border-stone-300 rounded" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Issuer Name Color</label>
                                <input type="color" value={template.issuer_name_styling.color || template.primary_color} onChange={(e) => setStyle("issuer_name_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-700">Designation Color</label>
                                <input type="color" value={template.issuer_designation_styling.color} onChange={(e) => setStyle("issuer_designation_styling", "color", e.target.value)} className="mt-1 w-full h-7 rounded border border-stone-300 cursor-pointer" />
                            </div>
                        </div>
                    </section>
                </div>
            </aside>

            {/* Preview */}
            <main className="flex-1 flex flex-col items-center justify-start p-4 overflow-auto bg-stone-200">
                <div className="bg-white rounded-xl shadow-xl border border-stone-300">
                    <Certificate template={template} />
                </div>
            </main>
        </div>
    );
}