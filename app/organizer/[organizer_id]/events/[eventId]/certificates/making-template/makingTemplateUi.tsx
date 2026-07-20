'use client'

import { CertificateTemplate,CertElement,Blockchain,Canvas } from "@/src/services/certificate.template.services";
import { useState, useRef, useEffect } from "react";


const FONT_OPTIONS = ["Clash Display", "Inter", "Georgia", "Playfair Display", "Space Grotesk"];

export default function MakingTemplateUi({initialTemplate,save_template} : {initialTemplate : CertificateTemplate,save_template:(template: CertificateTemplate) => Promise<void>}) {
    const [template, setTemplate] = useState<CertificateTemplate>(initialTemplate);
    const [selectedId, setSelectedId] = useState<string>("el_event_name");
    const [zoom, setZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    const selectedElement = template.elements.find((el) => el.id === selectedId) ?? null;

    function updateElement(id: string, patch: Partial<CertElement>) {
        setTemplate((prev) => ({
            ...prev,
            elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
        }));
    }

    function deleteElement(id: string) {
        setTemplate((prev) => ({
            ...prev,
            elements: prev.elements.filter((el) => el.id !== id),
        }));
        setSelectedId("");
        setEditingId(null);
    }

    function duplicateElement(id: string) {
        const el = template.elements.find((e) => e.id === id);
        if (!el) return;
        const copy: CertElement = { ...el, id: `${el.id}_copy_${Date.now()}`, x: el.x + 16, y: el.y + 16 };
        setTemplate((prev) => ({ ...prev, elements: [...prev.elements, copy] }));
        setSelectedId(copy.id);
    }

    return (
        <div className="flex flex-col h-screen bg-stone-100 text-gray-900">
            {/* Top toolbar */}
            <div className="flex items-center justify-between h-[52px] px-5 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <button
                        className="flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        aria-label="Zoom out"
                        onClick={() => setZoom((z) => Math.max(25, z - 10))}
                    >
                        <ZoomOutIcon />
                    </button>
                    <span className="text-[13px] text-gray-700 min-w-[36px] text-center">{zoom}%</span>
                    <button
                        className="flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        aria-label="Zoom in"
                        onClick={() => setZoom((z) => Math.min(200, z + 10))}
                    >
                        <ZoomInIcon />
                    </button>
                    <div className="w-px h-5 bg-gray-200 mx-1" />

                </div>
                <div className="flex items-center gap-2.5">
                    <span className="text-xs tracking-wide text-gray-500 uppercase">Show Grid</span>
                    <Toggle checked={showGrid} onChange={setShowGrid} />
                </div>
                 <div className="flex items-center gap-2.5">
                   <button onClick={()=>{save_template(template)}}>Save Template</button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Canvas */}
                <div className="relative flex-1 flex items-center justify-center overflow-auto bg-[#eeeeec]">
                    <div
                        className="p-10 origin-center"
                        style={{
                            transform: `scale(${zoom / 100})`,
                            backgroundImage: showGrid ? "radial-gradient(circle, #d4d4d4 1px, transparent 1px)" : "none",
                            backgroundSize: "20px 20px",
                        }}
                    >
                        <div
                            className="relative shadow-[0_0_0_6px_#ffffff,0_0_0_7px_#e2e2e2,0_8px_24px_rgba(0,0,0,0.08)]"
                            style={{
                                width: template.canvas.width,
                                height: template.canvas.height,
                                background: template.canvas.background || '#ffffff',
                            }}
                        >
                            {template.elements.map((el) => (
                                <ElementRenderer
                                    key={el.id}
                                    element={el}
                                    isSelected={el.id === selectedId}
                                    isEditing={el.id === editingId}
                                    onSelect={() => { setSelectedId(el.id); setEditingId(null); }}
                                    onStartEdit={() => setEditingId(el.id)}
                                    onFinishEdit={(newContent) => {
                                        setEditingId(null);
                                        if (newContent !== undefined) updateElement(el.id, { content: newContent });
                                    }}
                                    onDelete={() => deleteElement(el.id)}
                                    onDuplicate={() => duplicateElement(el.id)}
                                />
                            ))}
                        </div>
                    </div>

         
                </div>

                {/* Right property panel */}
                <div className="w-[280px] flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto p-5">
                    <section className="pb-5 mb-5 border-b border-gray-100">
                        <h3 className="text-sm font-semibold mb-3">Text Properties</h3>

                        {!selectedElement && <p className="text-xs text-gray-400">Select an element to edit its properties.</p>}

                        {selectedElement && (
                            <>
                                <label className="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase mt-3.5 mb-1.5">
                                    Font Family
                                </label>
                                <select
                                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[13px] bg-white cursor-pointer"
                                    value={selectedElement.fontFamily}
                                    onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                                >
                                    {FONT_OPTIONS.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>

                                <div className="flex items-center justify-between mt-3.5">
                                    <label className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">Font Size</label>
                                    <span className="text-xs text-gray-500">{selectedElement.fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min={10}
                                    max={72}
                                    value={selectedElement.fontSize}
                                    className="w-full mt-2 accent-gray-900"
                                    onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                                />

                                <label className="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase mt-3.5 mb-1.5">
                                    Weight
                                </label>
                                <div className="flex gap-1 bg-gray-100 p-[3px] rounded-lg">
                                    {(["normal", "medium", "bold"] as const).map((w) => (
                                        <button
                                            key={w}
                                            className={`flex-1 py-1.5 px-2 text-xs rounded-md ${selectedElement.fontWeight === w
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-500"
                                                }`}
                                            onClick={() => updateElement(selectedElement.id, { fontWeight: w })}
                                        >
                                            {w === "normal" ? "Regular" : w === "medium" ? "Medium" : "Bold"}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3.5">
                                    <div>
                                        <label className="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-1.5">
                                            Alignment
                                        </label>
                                        <div className="flex gap-1 bg-gray-100 p-[3px] rounded-lg">
                                            {(["left", "center", "right"] as const).map((a) => (
                                                <button
                                                    key={a}
                                                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md ${selectedElement.align === a
                                                        ? "bg-gray-900 text-white"
                                                        : "text-gray-500"
                                                        }`}
                                                    aria-label={`Align ${a}`}
                                                    onClick={() => updateElement(selectedElement.id, { align: a })}
                                                >
                                                    <AlignIcon type={a} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase mb-1.5">
                                            Position
                                        </label>
                                        <div className="flex gap-1.5">
                                            <div className="flex items-center gap-1 border border-gray-200 rounded-md px-1.5 py-1 text-[11px] text-gray-400">
                                                <span>x:</span>
                                                <input
                                                    type="number"
                                                    className="w-9 outline-none text-xs text-gray-900"
                                                    value={selectedElement.x}
                                                    onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 border border-gray-200 rounded-md px-1.5 py-1 text-[11px] text-gray-400">
                                                <span>y:</span>
                                                <input
                                                    type="number"
                                                    className="w-9 outline-none text-xs text-gray-900"
                                                    value={selectedElement.y}
                                                    onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    <section className="pb-5 mb-5 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold flex items-center">
                                <BlockchainIcon /> Blockchain
                            </h3>
                            <Toggle
                                checked={template.blockchain.enabled}
                                onChange={(v) => setTemplate((p) => ({ ...p, blockchain: { ...p.blockchain, enabled: v } }))}
                            />
                        </div>
                        <label className="block text-[10px] font-semibold tracking-wider text-gray-400 uppercase mt-3.5 mb-1.5">
                            Network
                        </label>
                        <div className="flex items-center gap-2 w-full px-2.5 py-2 border border-gray-200 rounded-lg text-[13px]">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            {template.blockchain.network}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function ElementRenderer({
    element,
    isSelected,
    isEditing,
    onSelect,
    onStartEdit,
    onFinishEdit,
    onDelete,
    onDuplicate,
}: {
    element: CertElement;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: () => void;
    onStartEdit: () => void;
    onFinishEdit: (newContent?: string) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const positionStyle = {
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
    };

    const textStyle = {
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight === "bold" ? 700 : element.fontWeight === "medium" ? 500 : 400,
        textAlign: element.align as any,
        color: element.color,
    };

    return (
        <div
            className={`absolute flex items-center justify-center transition-[outline-color] duration-150 ${element.editable ? "cursor-pointer hover:outline hover:outline-1 hover:outline-dashed hover:outline-slate-400" : "cursor-default pointer-events-none"
                } ${isSelected && !isEditing ? "outline outline-1 outline-gray-900" : ""}`}
            style={positionStyle}
            onClick={(e) => {
                e.stopPropagation();
                if (element.editable) onSelect();
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (element.type === "text" && element.editable) onStartEdit();
            }}
        >
            {isSelected && element.editable && !isEditing && (
                <div className="absolute -top-[38px] left-1/2 -translate-x-1/2 flex gap-1 bg-gray-900 p-1.5 rounded-full shadow-lg z-10">
                    <button
                        className="w-6 h-6 rounded-full text-white flex items-center justify-center hover:bg-white/15"
                        aria-label="Edit"
                        onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                    >
                        <EditIcon />
                    </button>
                    <button
                        className="w-6 h-6 rounded-full text-white flex items-center justify-center hover:bg-white/15"
                        aria-label="Duplicate"
                        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                    >
                        <DuplicateIcon />
                    </button>
                    <button
                        className="w-6 h-6 rounded-full text-white flex items-center justify-center hover:bg-white/15"
                        aria-label="Delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                        <TrashIcon />
                    </button>
                </div>
            )}

            {isSelected && element.editable && !isEditing && (
                <>
                    <span className="absolute -top-1 -left-1 w-[7px] h-[7px] bg-white border border-gray-900 z-10 cursor-nwse-resize" />
                    <span className="absolute -top-1 -right-1 w-[7px] h-[7px] bg-white border border-gray-900 z-10 cursor-nesw-resize" />
                    <span className="absolute -bottom-1 -left-1 w-[7px] h-[7px] bg-white border border-gray-900 z-10 cursor-nesw-resize" />
                    <span className="absolute -bottom-1 -right-1 w-[7px] h-[7px] bg-white border border-gray-900 z-10 cursor-nwse-resize" />
                </>
            )}

            {element.type === "text" ? (
                isEditing ? (
                    <textarea
                        ref={inputRef}
                        className="w-full h-full bg-white/90 border border-gray-900 rounded-sm p-1 resize-none outline-none leading-[1.3]"
                        style={textStyle}
                        defaultValue={element.content}
                        onBlur={(e) => onFinishEdit(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onFinishEdit(e.currentTarget.value);
                            }
                            if (e.key === "Escape") {
                                onFinishEdit(undefined);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="w-full whitespace-pre-wrap leading-[1.3]" style={textStyle}>{element.content}</div>
                )
            ) : (
                <div className="w-full h-full rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50">
                    <ImagePlaceholderIcon />
                </div>
            )}
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-150 ${checked ? "bg-gray-900" : "bg-gray-300"}`}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${checked ? "translate-x-4" : "translate-x-0"
                    }`}
            />
        </button>
    );
}

/* --- Icons (inline, no external deps) --- */

function ZoomOutIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" />
        </svg>
    );
}
function ZoomInIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
        </svg>
    );
}
function FitIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
        </svg>
    );
}
function PlusIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}
function EditIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    );
}
function DuplicateIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
    );
}
function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
    );
}
function ImagePlaceholderIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
    );
}
function BlockchainIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 -translate-y-px">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}
function AlignIcon({ type }: { type: "left" | "center" | "right" }) {
    const lines =
        type === "left" ? ["3,6 15,6", "3,12 21,12", "3,18 12,18"] :
            type === "center" ? ["6,6 18,6", "3,12 21,12", "7,18 17,18"] :
                ["9,6 21,6", "3,12 21,12", "12,18 21,18"];
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {lines.map((pts, i) => {
                const [x1, y1] = pts.split(" ")[0].split(",").map(Number);
                const [x2, y2] = pts.split(" ")[1].split(",").map(Number);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
        </svg>
    );
}