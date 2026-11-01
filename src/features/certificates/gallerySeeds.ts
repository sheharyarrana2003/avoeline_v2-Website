import { defaultLayout, type CertificateLayout } from "./layout.types";

function clone(layout: CertificateLayout): CertificateLayout {
  return JSON.parse(JSON.stringify(layout)) as CertificateLayout;
}

export type GallerySeed = { id: string; name: string; layout: CertificateLayout };

export const GALLERY_SEEDS: GallerySeed[] = [
  {
    id: "classic",
    name: "Classic",
    layout: defaultLayout(),
  },
  {
    id: "modern",
    name: "Modern",
    layout: (() => {
      const l = clone(defaultLayout());
      l.page.background.color = "#0f172a";
      for (const el of l.elements) {
        if (el.type === "text" && el.style) {
          el.style.color = el.id === "body" || el.id === "number" ? "#cbd5e1" : "#f8fafc";
          el.style.fontFamily = "Inter";
        }
      }
      return l;
    })(),
  },
  {
    id: "minimal",
    name: "Minimal",
    layout: (() => {
      const l = clone(defaultLayout());
      l.elements = l.elements.filter((e) => e.id !== "qr");
      l.elements.push({
        id: "rule",
        type: "line",
        x: 200,
        y: 180,
        w: 442,
        h: 0,
        z: 1,
        style: { stroke: "#94a3b8", strokeWidth: 1 },
      });
      return l;
    })(),
  },
  {
    id: "formal",
    name: "Formal",
    layout: (() => {
      const l = clone(defaultLayout());
      l.elements.unshift({
        id: "border",
        type: "shape",
        shapeKind: "rect",
        x: 24,
        y: 24,
        w: 794,
        h: 547,
        z: 0,
        style: { fill: "transparent", stroke: "#b45309", strokeWidth: 3, radius: 4 },
      });
      return l;
    })(),
  },
  {
    id: "bold",
    name: "Bold band",
    layout: (() => {
      const l = clone(defaultLayout());
      l.elements.unshift({
        id: "band",
        type: "shape",
        shapeKind: "rect",
        x: 0,
        y: 0,
        w: 842,
        h: 90,
        z: 0,
        style: { fill: "#1d4ed8" },
      });
      const title = l.elements.find((e) => e.id === "title");
      if (title?.style) title.style.color = "#ffffff";
      return l;
    })(),
  },
  {
    id: "portrait",
    name: "Portrait",
    layout: (() => {
      const l = clone(defaultLayout());
      l.page.size = "A4-portrait";
      l.page.width = 595;
      l.page.height = 842;
      for (const el of l.elements) {
        el.w = Math.min(el.w, 450);
        el.x = Math.min(el.x, 70);
      }
      return l;
    })(),
  },
];
