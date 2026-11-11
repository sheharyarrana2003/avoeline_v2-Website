"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CERT_TOKENS,
  CURATED_FONTS,
  PAGE_PRESETS,
  defaultLayout,
  type CertificateLayout,
  type ElementType,
  type LayoutElement,
  type PageSize,
  type TemplateAssets,
} from "@/src/features/certificates/layout.types";
import type { CertificateTemplateRow } from "@/src/features/certificates/types";
import { GALLERY_SEEDS } from "@/src/features/certificates/gallerySeeds";
import { renderCertificate } from "@/src/features/certificates/renderCertificate";
import {
  applyGallerySeedAction,
  publishTemplateAction,
  reRenderAllWithLatestAction,
  saveDraftAction,
  setEmailAttachPdfAction,
} from "@/src/features/certificates/actions/template.action";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass } from "@/src/lib/ui";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const Rect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });
const Text = dynamic(() => import("react-konva").then((m) => m.Text), { ssr: false });
const Line = dynamic(() => import("react-konva").then((m) => m.Line), { ssr: false });
const Ellipse = dynamic(() => import("react-konva").then((m) => m.Ellipse), { ssr: false });
const Group = dynamic(() => import("react-konva").then((m) => m.Group), { ssr: false });
const Transformer = dynamic(() => import("react-konva").then((m) => m.Transformer), {
  ssr: false,
});

function hydrateLayout(raw: CertificateLayout | null | undefined): CertificateLayout {
  if (raw && raw.page && Array.isArray(raw.elements) && raw.elements.length > 0) {
    return cloneLayout(raw);
  }
  return cloneLayout(defaultLayout());
}

const SNAP = 8;
const HISTORY_MAX = 40;

const SAMPLE_SHORT = {
  recipient_name: "Alex Rivera",
  role: "Attendee",
  event_title: "Sample Summit",
  event_dates: "12 Oct 2026",
  issuer_name: "Avoeline",
  issuer_title: "Organizer",
  certificate_number: "CERT-DEMO01",
  verify_url: "https://avoeline.app/verify/demo",
};

const SAMPLE_LONG = {
  ...SAMPLE_SHORT,
  recipient_name: "Alexandria Maximillian von Habsburg-Lorraine III",
  event_title: "International Conference on Advanced Distributed Systems Engineering",
};

const SAMPLE_NON_LATIN = {
  ...SAMPLE_SHORT,
  recipient_name: "محمد علی خان / 山田太郎",
  event_title: "کراچی ٹیک سمٹ · 東京カンファレンス",
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneLayout(layout: CertificateLayout): CertificateLayout {
  return JSON.parse(JSON.stringify(layout)) as CertificateLayout;
}

function snap(n: number, enabled: boolean) {
  if (!enabled) return n;
  return Math.round(n / SNAP) * SNAP;
}

export default function CertificateEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: CertificateTemplateRow;
}) {
  const [layout, setLayout] = useState<CertificateLayout>(() => hydrateLayout(initial.layout));
  const [assets, setAssets] = useState<TemplateAssets>(() => initial.assets || {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapOn, setSnapOn] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stress, setStress] = useState<"short" | "long" | "nonlatin">("short");
  const [emailAttachPdf, setEmailAttachPdf] = useState(initial.emailAttachPdf);
  const [name, setName] = useState(initial.name);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const history = useRef<CertificateLayout[]>([hydrateLayout(initial.layout)]);
  const future = useRef<CertificateLayout[]>([]);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeRefs = useRef<Map<string, any>>(new Map());

  // Re-hydrate when async initial.layout arrives (avoids blank Konva after load).
  useEffect(() => {
    const next = hydrateLayout(initial.layout);
    setLayout(next);
    setAssets(initial.assets || {});
    setName(initial.name);
    setEmailAttachPdf(initial.emailAttachPdf);
    history.current = [cloneLayout(next)];
    future.current = [];
  }, [
    initial.id,
    initial.updatedAt,
    initial.layout,
    initial.assets,
    initial.name,
    initial.emailAttachPdf,
  ]);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const konvaNode = selectedId ? nodeRefs.current.get(selectedId) : null;
    if (konvaNode) {
      tr.nodes([konvaNode]);
      tr.getLayer?.()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, layout.elements]);

  const sample =
    stress === "long" ? SAMPLE_LONG : stress === "nonlatin" ? SAMPLE_NON_LATIN : SAMPLE_SHORT;

  const selected = useMemo(
    () => layout.elements.find((e) => e.id === selectedId) ?? null,
    [layout.elements, selectedId],
  );

  const pushHistory = useCallback((next: CertificateLayout) => {
    history.current = [...history.current.slice(-(HISTORY_MAX - 1)), cloneLayout(next)];
    future.current = [];
  }, []);

  const updateLayout = useCallback(
    (mutator: (prev: CertificateLayout) => CertificateLayout) => {
      setLayout((prev) => {
        const next = mutator(cloneLayout(prev));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const undo = () => {
    if (history.current.length < 2) return;
    const current = history.current.pop()!;
    future.current.push(current);
    setLayout(cloneLayout(history.current[history.current.length - 1]!));
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(cloneLayout(next));
    setLayout(cloneLayout(next));
  };

  // Autosave draft (debounced)
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await saveDraftAction({
          eventId,
          name,
          layout,
          assets,
          emailAttachPdf,
        });
        if (result.ok) setStatusMsg("Draft saved");
        else setStatusMsg(result.error.message);
      });
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [eventId, layout, assets, name, emailAttachPdf]);

  const preview = useMemo(() => {
    const resolved: Record<string, string> = {};
    for (const [k, v] of Object.entries(assets)) {
      if (v) resolved[k] = v;
    }
    return renderCertificate(layout, sample, resolved);
  }, [layout, sample, assets]);

  const addElement = (type: ElementType) => {
    updateLayout((prev) => {
      const z = prev.elements.reduce((m, e) => Math.max(m, e.z ?? 0), 0) + 1;
      const base: LayoutElement = {
        id: uid(type),
        type,
        x: 80,
        y: 80,
        w: type === "line" ? 200 : type === "qr" ? 80 : 240,
        h: type === "line" ? 0 : type === "qr" ? 80 : 48,
        z,
        content: type === "text" ? "{{attendeeName}}" : type === "qr" ? "{{verifyUrl}}" : "",
        shapeKind: type === "shape" ? "rect" : undefined,
        style:
          type === "text"
            ? { fontFamily: "Georgia", fontSize: 24, color: "#111111", align: "center" }
            : type === "shape"
              ? { fill: "#e2e8f0", stroke: "#94a3b8", strokeWidth: 1 }
              : type === "line"
                ? { stroke: "#111111", strokeWidth: 2 }
                : undefined,
        fit: type === "text" ? "shrink" : undefined,
      };
      return { ...prev, elements: [...prev.elements, base] };
    });
  };

  const patchSelected = (patch: Partial<LayoutElement>) => {
    if (!selectedId) return;
    updateLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((e) =>
        e.id === selectedId ? { ...e, ...patch, style: { ...e.style, ...patch.style } } : e,
      ),
    }));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    updateLayout((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    updateLayout((prev) => {
      const copy: LayoutElement = {
        ...cloneLayout({ ...prev, elements: [selected] }).elements[0]!,
        id: uid(selected.type),
        x: selected.x + 16,
        y: selected.y + 16,
        z: (selected.z ?? 0) + 1,
      };
      return { ...prev, elements: [...prev.elements, copy] };
    });
  };

  const moveZ = (dir: "up" | "down") => {
    if (!selectedId) return;
    updateLayout((prev) => {
      const els = [...prev.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
      const idx = els.findIndex((e) => e.id === selectedId);
      if (idx < 0) return prev;
      const swapWith = dir === "up" ? idx + 1 : idx - 1;
      if (swapWith < 0 || swapWith >= els.length) return prev;
      const a = els[idx]!;
      const b = els[swapWith]!;
      const za = a.z ?? idx;
      const zb = b.z ?? swapWith;
      return {
        ...prev,
        elements: prev.elements.map((e) => {
          if (e.id === a.id) return { ...e, z: zb };
          if (e.id === b.id) return { ...e, z: za };
          return e;
        }),
      };
    });
  };

  const setPagePreset = (size: PageSize) => {
    const preset = PAGE_PRESETS[size];
    updateLayout((prev) => ({
      ...prev,
      page: { ...prev.page, size, width: preset.width, height: preset.height },
    }));
  };

  const scale = Math.min(1, 720 / layout.page.width);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-ink">Certificate editor</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Draft autosaves. Publish to bump the template version for new issues.
            {statusMsg ? ` · ${statusMsg}` : ""}
            {pending ? " · Saving…" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass("secondary", "sm")} onClick={undo}>
            Undo
          </button>
          <button type="button" className={buttonClass("secondary", "sm")} onClick={redo}>
            Redo
          </button>
          <button
            type="button"
            className={buttonClass("primary", "sm")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await publishTemplateAction({ eventId });
                setStatusMsg(
                  result.ok ? `Published v${result.data.version}` : result.error.message,
                );
              })
            }
          >
            Publish
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-ink-soft">
          Template name
          <input
            className={`${fieldClass} mt-1 block min-w-[200px]`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-xs text-ink-soft">
          Page
          <select
            className={`${fieldClass} mt-1 block`}
            value={layout.page.size}
            onChange={(e) => setPagePreset(e.target.value as PageSize)}
          >
            {Object.keys(PAGE_PRESETS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Grid
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
          Snap
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={emailAttachPdf}
            onChange={(e) => {
              const next = e.target.checked;
              setEmailAttachPdf(next);
              startTransition(async () => {
                const result = await setEmailAttachPdfAction({ eventId, emailAttachPdf: next });
                if (!result.ok) setStatusMsg(result.error.message);
              });
            }}
          />
          Attach PDF on email (off by default — emails use an Avoeline download link)
        </label>
        <label className="text-xs text-ink-soft">
          Name stress
          <select
            className={`${fieldClass} mt-1 block`}
            value={stress}
            onChange={(e) => setStress(e.target.value as typeof stress)}
          >
            <option value="short">Short</option>
            <option value="long">Long</option>
            <option value="nonlatin">Non-Latin</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["text", "image", "shape", "line", "qr"] as ElementType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => addElement(t)}
          >
            Add {t}
          </button>
        ))}
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={duplicateSelected}
          disabled={!selected}
        >
          Duplicate
        </button>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={() => moveZ("up")}
          disabled={!selected}
        >
          Bring forward
        </button>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={() => moveZ("down")}
          disabled={!selected}
        >
          Send back
        </button>
        <button
          type="button"
          className={buttonClass("destructive", "sm")}
          onClick={removeSelected}
          disabled={!selected}
        >
          Delete
        </button>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await reRenderAllWithLatestAction({ eventId });
              setStatusMsg(
                result.ok ? `Re-bound ${result.data.updated} certificates` : result.error.message,
              );
            })
          }
        >
          Re-render all with latest
        </button>
        <button
          type="button"
          className={buttonClass("primary", "sm")}
          onClick={() => setPreviewOpen(true)}
        >
          Preview
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-2xs font-medium uppercase text-ink-soft">Gallery</p>
        <div className="flex flex-wrap gap-2">
          {GALLERY_SEEDS.map((seed) => (
            <button
              key={seed.id}
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() =>
                startTransition(async () => {
                  const result = await applyGallerySeedAction({ eventId, seedId: seed.id });
                  if (result.ok) {
                    setLayout(cloneLayout(result.data.layout));
                    setName(result.data.name);
                    history.current = [cloneLayout(result.data.layout)];
                    future.current = [];
                    setStatusMsg(`Applied ${seed.name}`);
                  } else setStatusMsg(result.error.message);
                })
              }
            >
              {seed.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="overflow-auto rounded-lg border border-line bg-muted/40 p-3">
          <div style={{ width: layout.page.width * scale, height: layout.page.height * scale }}>
            <Stage
              width={layout.page.width * scale}
              height={layout.page.height * scale}
              scaleX={scale}
              scaleY={scale}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={layout.page.width}
                  height={layout.page.height}
                  fill={layout.page.background.color || "#ffffff"}
                />
                {showGrid
                  ? Array.from({ length: Math.ceil(layout.page.width / 40) }).map((_, i) => (
                      <Line
                        key={`vg-${i}`}
                        points={[i * 40, 0, i * 40, layout.page.height]}
                        stroke="#e2e8f0"
                        strokeWidth={1}
                        listening={false}
                      />
                    ))
                  : null}
                {showGrid
                  ? Array.from({ length: Math.ceil(layout.page.height / 40) }).map((_, i) => (
                      <Line
                        key={`hg-${i}`}
                        points={[0, i * 40, layout.page.width, i * 40]}
                        stroke="#e2e8f0"
                        strokeWidth={1}
                        listening={false}
                      />
                    ))
                  : null}
                {[...layout.elements]
                  .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
                  .map((el) => (
                    <Group
                      key={el.id}
                      ref={(node) => {
                        if (node) nodeRefs.current.set(el.id, node);
                        else nodeRefs.current.delete(el.id);
                      }}
                      x={el.x}
                      y={el.y}
                      draggable
                      onClick={() => setSelectedId(el.id)}
                      onTap={() => setSelectedId(el.id)}
                      onDragEnd={(e) => {
                        const x = snap(e.target.x(), snapOn);
                        const y = snap(e.target.y(), snapOn);
                        e.target.position({ x, y });
                        updateLayout((prev) => ({
                          ...prev,
                          elements: prev.elements.map((item) =>
                            item.id === el.id ? { ...item, x, y } : item,
                          ),
                        }));
                      }}
                      onTransformEnd={(e) => {
                        const node = e.target;
                        const scaleX = node.scaleX();
                        const scaleY = node.scaleY();
                        node.scaleX(1);
                        node.scaleY(1);
                        updateLayout((prev) => ({
                          ...prev,
                          elements: prev.elements.map((item) =>
                            item.id === el.id
                              ? {
                                  ...item,
                                  x: snap(node.x(), snapOn),
                                  y: snap(node.y(), snapOn),
                                  w: Math.max(8, snap(el.w * scaleX, snapOn)),
                                  h: Math.max(8, snap((el.h || 8) * scaleY, snapOn)),
                                }
                              : item,
                          ),
                        }));
                      }}
                    >
                      {el.type === "text" ? (
                        <Text
                          text={el.content || "Text"}
                          width={el.w}
                          height={el.h}
                          fontSize={el.style?.fontSize ?? 16}
                          fontFamily={el.style?.fontFamily || "Inter"}
                          fill={el.style?.color || "#111"}
                          align={el.style?.align || "left"}
                        />
                      ) : null}
                      {el.type === "shape" && el.shapeKind === "ellipse" ? (
                        <Ellipse
                          radiusX={el.w / 2}
                          radiusY={el.h / 2}
                          x={el.w / 2}
                          y={el.h / 2}
                          fill={el.style?.fill || "#e2e8f0"}
                          stroke={el.style?.stroke || "#94a3b8"}
                          strokeWidth={el.style?.strokeWidth ?? 1}
                        />
                      ) : null}
                      {el.type === "shape" && el.shapeKind !== "ellipse" ? (
                        <Rect
                          width={el.w}
                          height={el.h}
                          fill={el.style?.fill || "#e2e8f0"}
                          stroke={el.style?.stroke || "#94a3b8"}
                          strokeWidth={el.style?.strokeWidth ?? 1}
                          cornerRadius={el.style?.radius ?? 0}
                        />
                      ) : null}
                      {el.type === "line" ? (
                        <Line
                          points={[0, 0, el.w, el.h]}
                          stroke={el.style?.stroke || "#111"}
                          strokeWidth={el.style?.strokeWidth ?? 2}
                        />
                      ) : null}
                      {el.type === "qr" || el.type === "image" ? (
                        <Rect
                          width={el.w}
                          height={el.h}
                          fill="#f8fafc"
                          stroke={selectedId === el.id ? "#2563eb" : "#94a3b8"}
                          dash={[4, 4]}
                        />
                      ) : null}
                    </Group>
                  ))}
                <Transformer
                  ref={(node) => {
                    trRef.current = node;
                  }}
                  rotateEnabled={false}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 8 || newBox.height < 8) return oldBox;
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-line p-3">
          <p className="text-2xs font-medium uppercase text-ink-soft">Inspector</p>
          {!selected ? (
            <p className="text-sm text-ink-soft">Select an element on the canvas.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-mono text-xs text-ink-faint">{selected.type}</p>
              {selected.type === "text" ? (
                <>
                  <label className="block text-xs text-ink-soft">
                    Content
                    <textarea
                      className={`${fieldClass} mt-1 block w-full`}
                      rows={3}
                      value={selected.content || ""}
                      onChange={(e) => patchSelected({ content: e.target.value })}
                    />
                  </label>
                  <label className="block text-xs text-ink-soft">
                    Insert token
                    <select
                      className={`${fieldClass} mt-1 block w-full`}
                      defaultValue=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        patchSelected({ content: `${selected.content || ""}${e.target.value}` });
                        e.target.value = "";
                      }}
                    >
                      <option value="">Token…</option>
                      {CERT_TOKENS.map((t) => (
                        <option key={t.token} value={t.token}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-ink-soft">
                    Font
                    <select
                      className={`${fieldClass} mt-1 block w-full`}
                      value={selected.style?.fontFamily || "Inter"}
                      onChange={(e) =>
                        patchSelected({ style: { ...selected.style, fontFamily: e.target.value } })
                      }
                    >
                      {CURATED_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-ink-soft">
                    Size
                    <input
                      type="number"
                      className={`${fieldClass} mt-1 block w-full`}
                      value={selected.style?.fontSize ?? 16}
                      onChange={(e) =>
                        patchSelected({
                          style: { ...selected.style, fontSize: Number(e.target.value) || 16 },
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs text-ink-soft">
                    Color
                    <input
                      type="color"
                      className="mt-1 block h-9 w-full"
                      value={selected.style?.color || "#111111"}
                      onChange={(e) =>
                        patchSelected({ style: { ...selected.style, color: e.target.value } })
                      }
                    />
                  </label>
                </>
              ) : null}
              {(selected.type === "shape" || selected.type === "line") && (
                <label className="block text-xs text-ink-soft">
                  Fill / stroke
                  <input
                    type="color"
                    className="mt-1 block h-9 w-full"
                    value={selected.style?.fill || selected.style?.stroke || "#e2e8f0"}
                    onChange={(e) =>
                      patchSelected({
                        style: {
                          ...selected.style,
                          fill: e.target.value,
                          stroke: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "w", "h"] as const).map((key) => (
                  <label key={key} className="block text-xs text-ink-soft">
                    {key.toUpperCase()}
                    <input
                      type="number"
                      className={`${fieldClass} mt-1 block w-full`}
                      value={selected[key]}
                      onChange={(e) => patchSelected({ [key]: Number(e.target.value) || 0 })}
                    />
                  </label>
                ))}
              </div>
              <label className="block text-xs text-ink-soft">
                Background
                <input
                  type="color"
                  className="mt-1 block h-9 w-full"
                  value={layout.page.background.color || "#ffffff"}
                  onChange={(e) =>
                    updateLayout((prev) => ({
                      ...prev,
                      page: {
                        ...prev.page,
                        background: { ...prev.page.background, color: e.target.value },
                      },
                    }))
                  }
                />
              </label>
              {(selected.type === "image" || selected.type === "qr") && (
                <label className="block text-xs text-ink-soft">
                  Asset key
                  <select
                    className={`${fieldClass} mt-1 block w-full`}
                    value={selected.assetKey || ""}
                    onChange={(e) => patchSelected({ assetKey: e.target.value || undefined })}
                  >
                    <option value="">None</option>
                    <option value="logo">logo</option>
                    <option value="signature">signature</option>
                    <option value="background">background</option>
                  </select>
                </label>
              )}
            </div>
          )}
          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-2xs font-medium uppercase text-ink-soft">Template assets</p>
            <label className="block text-xs text-ink-soft">
              Logo URL
              <input
                className={`${fieldClass} mt-1 block w-full`}
                value={assets.logo || ""}
                onChange={(e) => setAssets((a) => ({ ...a, logo: e.target.value || undefined }))}
              />
            </label>
            <label className="block text-xs text-ink-soft">
              Signature URL
              <input
                className={`${fieldClass} mt-1 block w-full`}
                value={assets.signature || ""}
                onChange={(e) =>
                  setAssets((a) => ({ ...a, signature: e.target.value || undefined }))
                }
              />
            </label>
          </div>
        </aside>
      </div>

      <aside className="space-y-3 rounded-lg border border-line p-3 lg:hidden">
        <p className="text-2xs font-medium uppercase text-ink-soft">Assets</p>
        <label className="block text-xs text-ink-soft">
          Logo URL
          <input
            className={`${fieldClass} mt-1 block w-full`}
            value={assets.logo || ""}
            onChange={(e) => setAssets((a) => ({ ...a, logo: e.target.value || undefined }))}
            placeholder="https://… or Drive file URL"
          />
        </label>
        <label className="block text-xs text-ink-soft">
          Signature URL
          <input
            className={`${fieldClass} mt-1 block w-full`}
            value={assets.signature || ""}
            onChange={(e) => setAssets((a) => ({ ...a, signature: e.target.value || undefined }))}
            placeholder="https://… or Drive file URL"
          />
        </label>
      </aside>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Certificate preview"
        maxWidth="2xl"
      >
        <div
          className="overflow-auto rounded-lg border border-line bg-white p-2"
          dangerouslySetInnerHTML={{ __html: preview.svg }}
        />
      </Modal>
    </div>
  );
}
