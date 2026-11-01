/** Client-safe certificate layout JSON (Phase 5). */

export const PAGE_PRESETS = {
  "A4-landscape": { width: 842, height: 595 },
  "A4-portrait": { width: 595, height: 842 },
  "Letter-landscape": { width: 792, height: 612 },
  custom: { width: 842, height: 595 },
} as const;

export type PageSize = keyof typeof PAGE_PRESETS;

export type ElementType = "text" | "image" | "shape" | "line" | "qr";
export type FitMode = "shrink" | "wrap" | "clip";
export type ShapeKind = "rect" | "ellipse";

export type ElementStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
};

export type LayoutElement = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z?: number;
  style?: ElementStyle;
  content?: string;
  assetKey?: string;
  shapeKind?: ShapeKind;
  fit?: FitMode;
};

export type CertificateLayout = {
  schemaVersion: number;
  page: {
    size: PageSize;
    width: number;
    height: number;
    background: { color: string; imageAsset?: string };
  };
  elements: LayoutElement[];
};

export type TemplateAssets = {
  logo?: string;
  signature?: string;
  background?: string;
  [key: string]: string | undefined;
};

export type CertificateData = {
  recipient_name: string;
  role?: string;
  award?: string;
  event_title: string;
  event_dates?: string;
  issuer_name?: string;
  issuer_title?: string;
  certificate_number?: string;
  verify_url?: string;
  custom_fields?: Record<string, string>;
};

export const CERT_TOKENS = [
  { token: "{{attendeeName}}", label: "Attendee name" },
  { token: "{{eventTitle}}", label: "Event title" },
  { token: "{{eventDate}}", label: "Event date" },
  { token: "{{role}}", label: "Role / award" },
  { token: "{{certificateNumber}}", label: "Certificate number" },
  { token: "{{issuerName}}", label: "Issuer name" },
  { token: "{{issuerTitle}}", label: "Issuer title" },
  { token: "{{verifyUrl}}", label: "Verify URL" },
] as const;

export const CURATED_FONTS = [
  "Inter",
  "Georgia",
  "Times New Roman",
  "Helvetica",
  "Courier New",
] as const;

export function defaultLayout(): CertificateLayout {
  const page = PAGE_PRESETS["A4-landscape"];
  return {
    schemaVersion: 1,
    page: {
      size: "A4-landscape",
      width: page.width,
      height: page.height,
      background: { color: "#ffffff" },
    },
    elements: [
      {
        id: "title",
        type: "text",
        x: 80,
        y: 80,
        w: 682,
        h: 48,
        z: 2,
        fit: "shrink",
        content: "Certificate of Completion",
        style: {
          fontFamily: "Georgia",
          fontSize: 36,
          fontWeight: 700,
          color: "#111111",
          align: "center",
        },
      },
      {
        id: "name",
        type: "text",
        x: 80,
        y: 220,
        w: 682,
        h: 56,
        z: 3,
        fit: "shrink",
        content: "{{attendeeName}}",
        style: {
          fontFamily: "Georgia",
          fontSize: 42,
          fontWeight: 700,
          color: "#0f172a",
          align: "center",
        },
      },
      {
        id: "body",
        type: "text",
        x: 120,
        y: 300,
        w: 602,
        h: 80,
        z: 2,
        fit: "wrap",
        content: "for participating in {{eventTitle}} on {{eventDate}} as {{role}}.",
        style: {
          fontFamily: "Inter",
          fontSize: 16,
          color: "#334155",
          align: "center",
          lineHeight: 1.4,
        },
      },
      {
        id: "number",
        type: "text",
        x: 80,
        y: 520,
        w: 300,
        h: 24,
        z: 2,
        fit: "shrink",
        content: "{{certificateNumber}}",
        style: { fontFamily: "Inter", fontSize: 11, color: "#64748b", align: "left" },
      },
      {
        id: "qr",
        type: "qr",
        x: 720,
        y: 470,
        w: 80,
        h: 80,
        z: 4,
        content: "{{verifyUrl}}",
      },
    ],
  };
}
