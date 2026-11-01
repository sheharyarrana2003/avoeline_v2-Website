import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  CertificateData,
  CertificateLayout,
  LayoutElement,
  TemplateAssets,
} from "./layout.types";
import { escapeXml, interpolateTokens, shrinkFontSize } from "./interpolate";

export type ResolvedAssets = Record<string, string>;

export type RenderResult = {
  svg: string;
  width: number;
  height: number;
};

function sortedElements(layout: CertificateLayout): LayoutElement[] {
  return [...(layout.elements ?? [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
}

function resolveAsset(assets: ResolvedAssets | TemplateAssets, key?: string): string {
  if (!key) return "";
  return String((assets as Record<string, string | undefined>)[key] || "");
}

function renderSvgElement(
  el: LayoutElement,
  data: CertificateData,
  assets: ResolvedAssets,
): string {
  const rot = el.rotation
    ? ` transform="rotate(${el.rotation} ${el.x + el.w / 2} ${el.y + el.h / 2})"`
    : "";
  const opacity = el.style?.opacity != null ? ` opacity="${el.style.opacity}"` : "";

  if (el.type === "text") {
    const raw = interpolateTokens(el.content || "", data);
    const base = el.style?.fontSize ?? 16;
    const fit = el.fit || "shrink";
    const size = fit === "shrink" ? shrinkFontSize(raw, el.w, base) : base;
    const align = el.style?.align || "left";
    const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
    const tx = align === "center" ? el.x + el.w / 2 : align === "right" ? el.x + el.w : el.x;
    const ty = el.y + size;
    const weight = el.style?.fontWeight ?? 400;
    const family = el.style?.fontFamily || "Inter, system-ui, sans-serif";
    const color = el.style?.color || "#111111";
    if (fit === "wrap") {
      const words = raw.split(/\s+/);
      const lineH = (el.style?.lineHeight ?? 1.3) * size;
      const lines: string[] = [];
      let line = "";
      const maxChars = Math.max(8, Math.floor(el.w / (size * 0.5)));
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (next.length > maxChars && line) {
          lines.push(line);
          line = w;
        } else line = next;
      }
      if (line) lines.push(line);
      const maxLines = Math.max(1, Math.floor(el.h / lineH));
      const shown = lines.slice(0, maxLines);
      return `<text${rot}${opacity} x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="${escapeXml(family)}" font-size="${size}" font-weight="${weight}" fill="${escapeXml(color)}">${shown
        .map((ln, i) => `<tspan x="${tx}" dy="${i === 0 ? 0 : lineH}">${escapeXml(ln)}</tspan>`)
        .join("")}</text>`;
    }
    const clip =
      fit === "clip"
        ? `<clipPath id="c-${escapeXml(el.id)}"><rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/></clipPath>`
        : "";
    const body = `<text${rot}${opacity}${fit === "clip" ? ` clip-path="url(#c-${escapeXml(el.id)})"` : ""} x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="${escapeXml(family)}" font-size="${size}" font-weight="${weight}" fill="${escapeXml(color)}">${escapeXml(raw)}</text>`;
    return clip + body;
  }

  if (el.type === "image") {
    const href = resolveAsset(assets, el.assetKey);
    if (!href) return "";
    return `<image${rot}${opacity} href="${escapeXml(href)}" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  if (el.type === "shape") {
    const fill = el.style?.fill || "#e2e8f0";
    const stroke = el.style?.stroke || "none";
    const sw = el.style?.strokeWidth ?? 0;
    if (el.shapeKind === "ellipse") {
      return `<ellipse${rot}${opacity} cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${el.w / 2}" ry="${el.h / 2}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${sw}"/>`;
    }
    const r = el.style?.radius ?? 0;
    return `<rect${rot}${opacity} x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${r}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${sw}"/>`;
  }

  if (el.type === "line") {
    const stroke = el.style?.stroke || "#111111";
    const sw = el.style?.strokeWidth ?? 2;
    return `<line${rot}${opacity} x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" stroke="${escapeXml(stroke)}" stroke-width="${sw}"/>`;
  }

  if (el.type === "qr") {
    const payload = interpolateTokens(el.content || "{{verifyUrl}}", data);
    // Placeholder QR as labeled box (real QR encoded in PDF path via simple modules if needed)
    return `<g${rot}${opacity}><rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="#fff" stroke="#111" stroke-width="1"/><text x="${el.x + el.w / 2}" y="${el.y + el.h / 2}" text-anchor="middle" font-size="9" fill="#111">QR</text><title>${escapeXml(payload)}</title></g>`;
  }

  return "";
}

/** Pure SVG preview for web / verify / editor. */
export function renderCertificateSvg(
  layout: CertificateLayout,
  data: CertificateData,
  assets: ResolvedAssets = {},
): RenderResult {
  const w = layout.page?.width || 842;
  const h = layout.page?.height || 595;
  const bg = layout.page?.background?.color || "#ffffff";
  const bgImage = layout.page?.background?.imageAsset
    ? resolveAsset(assets, layout.page.background.imageAsset)
    : resolveAsset(assets, "background");
  const bgLayer = bgImage
    ? `<image href="${escapeXml(bgImage)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const body = sortedElements(layout)
    .map((el) => renderSvgElement(el, data, assets))
    .join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${escapeXml(bg)}"/>${bgLayer}${body}</svg>`;
  return { svg, width: w, height: h };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return { r: 0.07, g: 0.07, b: 0.07 };
  return {
    r: parseInt(m[1]!, 16) / 255,
    g: parseInt(m[2]!, 16) / 255,
    b: parseInt(m[3]!, 16) / 255,
  };
}

/** Server PDF — streamed, never stored. Uses pdf-lib standard fonts (embedded). */
export async function renderCertificatePdf(
  layout: CertificateLayout,
  data: CertificateData,
  _assets: ResolvedAssets = {},
): Promise<Uint8Array> {
  const w = layout.page?.width || 842;
  const h = layout.page?.height || 595;
  const doc = await PDFDocument.create();
  const page = doc.addPage([w, h]);
  const bg = hexToRgb(layout.page?.background?.color || "#ffffff");
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(bg.r, bg.g, bg.b) });

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSerif = await doc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const pickFont = (family?: string, weight?: number | string) => {
    const bold = Number(weight) >= 600 || weight === "bold";
    const serif = /georgia|times|serif/i.test(family || "");
    if (serif) return bold ? fontSerifBold : fontSerif;
    return bold ? fontBold : fontRegular;
  };

  for (const el of sortedElements(layout)) {
    if (el.type === "text") {
      const raw = interpolateTokens(el.content || "", data);
      const base = el.style?.fontSize ?? 16;
      const fit = el.fit || "shrink";
      let size = fit === "shrink" ? shrinkFontSize(raw, el.w, base) : base;
      const font = pickFont(el.style?.fontFamily, el.style?.fontWeight);
      const color = hexToRgb(el.style?.color || "#111111");
      const align = el.style?.align || "left";
      // PDF y is bottom-up
      const textWidth = font.widthOfTextAtSize(raw, size);
      let x = el.x;
      if (align === "center") x = el.x + (el.w - textWidth) / 2;
      if (align === "right") x = el.x + el.w - textWidth;
      if (fit === "wrap") {
        const words = raw.split(/\s+/);
        const lineH = (el.style?.lineHeight ?? 1.3) * size;
        let line = "";
        let row = 0;
        const maxRows = Math.max(1, Math.floor(el.h / lineH));
        const flush = (ln: string) => {
          if (row >= maxRows) return;
          const tw = font.widthOfTextAtSize(ln, size);
          let lx = el.x;
          if (align === "center") lx = el.x + (el.w - tw) / 2;
          if (align === "right") lx = el.x + el.w - tw;
          const y = h - el.y - size - row * lineH;
          page.drawText(ln, { x: lx, y, size, font, color: rgb(color.r, color.g, color.b) });
          row += 1;
        };
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(next, size) > el.w && line) {
            flush(line);
            line = word;
          } else line = next;
        }
        if (line) flush(line);
      } else {
        const y = h - el.y - size;
        page.drawText(raw.slice(0, 500), {
          x: Math.max(0, x),
          y: Math.max(0, y),
          size,
          font,
          color: rgb(color.r, color.g, color.b),
          maxWidth: fit === "clip" ? el.w : undefined,
        });
      }
    } else if (el.type === "shape" || el.type === "line") {
      const stroke = hexToRgb(el.style?.stroke || "#111111");
      const fill = hexToRgb(el.style?.fill || "#e2e8f0");
      if (el.type === "line") {
        page.drawLine({
          start: { x: el.x, y: h - el.y },
          end: { x: el.x + el.w, y: h - (el.y + el.h) },
          thickness: el.style?.strokeWidth ?? 2,
          color: rgb(stroke.r, stroke.g, stroke.b),
        });
      } else {
        page.drawRectangle({
          x: el.x,
          y: h - el.y - el.h,
          width: el.w,
          height: el.h,
          color: rgb(fill.r, fill.g, fill.b),
          borderColor: rgb(stroke.r, stroke.g, stroke.b),
          borderWidth: el.style?.strokeWidth ?? 0,
        });
      }
    } else if (el.type === "qr") {
      page.drawRectangle({
        x: el.x,
        y: h - el.y - el.h,
        width: el.w,
        height: el.h,
        borderColor: rgb(0.07, 0.07, 0.07),
        borderWidth: 1,
      });
    }
  }

  return doc.save();
}

/** Unified entry used by preview + PDF paths. */
export function renderCertificate(
  layout: CertificateLayout,
  data: CertificateData,
  assets: ResolvedAssets = {},
): RenderResult {
  return renderCertificateSvg(layout, data, assets);
}
