import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CertificateTemplate, Style_attributes } from "@/src/services/certificate.template.services";

/**
 * Render a stored certificate template to a PDF.
 *
 * pdf-lib rather than a headless browser. The template is already a set of
 * absolutely positioned elements with x, y, width, font size, colour and
 * alignment -- the editor draws them as CSS divs on a 700x500 canvas -- so it
 * maps directly onto pdf-lib's coordinate drawing. Rendering the HTML instead
 * would mean shipping Chromium into a serverless function to reproduce
 * coordinates the template already states.
 *
 * The two coordinate systems disagree on one thing: CSS measures y downward
 * from the top, PDF upward from the bottom. Every y is flipped once, here, in
 * `baseline`.
 */

export type CertificateFields = {
    recipientName: string;
    eventTitle: string;
    /** Already formatted for display -- this does no date work. */
    dateText: string;
    /** Attendee / Winner / Speaker / Volunteer / Organizer. */
    role: string;
    certificateId: string;
    /** Absolute URL of the public verification page, stamped in the footer. */
    verifyUrl?: string;
};

function parseColor(value: string | undefined, fallback = rgb(0, 0, 0)) {
    const hex = String(value ?? "").trim().replace(/^#/, "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    if (!/^[0-9a-f]{6}$/i.test(full)) return fallback;
    return rgb(
        parseInt(full.slice(0, 2), 16) / 255,
        parseInt(full.slice(2, 4), 16) / 255,
        parseInt(full.slice(4, 6), 16) / 255,
    );
}

/**
 * The template names web fonts (Inter, Arial). PDF has 14 standard faces and
 * no Inter, so everything resolves to Helvetica, bold when the weight asks for
 * it. Embedding the real face would mean shipping a font file for a difference
 * nobody reads on a certificate.
 */
function pickFont(style: Style_attributes, regular: PDFFont, bold: PDFFont): PDFFont {
    const weight = String(style?.fontWeight ?? "").toLowerCase();
    const isBold = weight === "bold" || (Number(weight) >= 600);
    return isBold ? bold : regular;
}

/** CSS y (from the top of the box) to a PDF text baseline. */
function baseline(style: Style_attributes, size: number, canvasHeight: number): number {
    const top = Number(style?.y ?? 0);
    // Sit the text on the box's first line rather than its top edge, or every
    // element renders one line-height too high.
    return canvasHeight - top - size;
}

function alignedX(text: string, style: Style_attributes, font: PDFFont, size: number): number {
    const x = Number(style?.x ?? 0);
    const boxWidth = Number(style?.width ?? 0);
    if (!boxWidth) return x;
    const textWidth = font.widthOfTextAtSize(text, size);
    if (style?.align === "center") return x + (boxWidth - textWidth) / 2;
    if (style?.align === "right") return x + boxWidth - textWidth;
    return x;
}

function drawLine(
    page: PDFPage,
    text: string,
    style: Style_attributes,
    canvasHeight: number,
    regular: PDFFont,
    bold: PDFFont,
) {
    const value = String(text ?? "").trim();
    if (!value) return;
    const font = pickFont(style, regular, bold);
    const size = Number(style?.fontSize) || 12;
    page.drawText(value, {
        x: alignedX(value, style, font, size),
        y: baseline(style, size, canvasHeight),
        size,
        font,
        color: parseColor(style?.color),
    });
}

/** Fetch and embed a logo or signature. Never throws -- a missing image is not
 *  a reason to fail the certificate. */
async function drawImage(pdf: PDFDocument, page: PDFPage, url: string, style: Style_attributes, canvasHeight: number) {
    const src = String(url ?? "").trim();
    if (!src || !/^https?:\/\//i.test(src)) return;
    try {
        const res = await fetch(src);
        if (!res.ok) return;
        const bytes = new Uint8Array(await res.arrayBuffer());
        const type = res.headers.get("content-type") ?? "";
        const image = /png/i.test(type) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const width = Number(style?.width) || image.width;
        const height = Number(style?.height) || image.height;
        page.drawImage(image, {
            x: Number(style?.x ?? 0),
            y: canvasHeight - Number(style?.y ?? 0) - height,
            width,
            height,
        });
    } catch (err) {
        console.warn("[renderCertificatePdf] could not embed an image", { src, err });
    }
}

export async function renderCertificatePdf(
    template: CertificateTemplate,
    fields: CertificateFields,
): Promise<Uint8Array> {
    const width = Number(template.canvas?.width) || 700;
    const height = Number(template.canvas?.height) || 500;

    const pdf = await PDFDocument.create();
    pdf.setTitle(`Certificate — ${fields.recipientName}`);
    pdf.setSubject(fields.eventTitle);
    // The id lives in the file's metadata as well as on the page, so it survives
    // a screenshot-and-crop that loses the footer.
    pdf.setKeywords([fields.certificateId]);

    const page = pdf.addPage([width, height]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({ x: 0, y: 0, width, height, color: parseColor(template.primary_color, rgb(1, 1, 1)) });

    const borderSize = Number(template.border_size) || 0;
    if (borderSize > 0) {
        page.drawRectangle({
            x: borderSize / 2,
            y: borderSize / 2,
            width: width - borderSize,
            height: height - borderSize,
            borderColor: parseColor(template.border_color),
            borderWidth: borderSize,
        });
    }

    await drawImage(pdf, page, template.logo_src, template.logo_styling, height);

    // The four dynamic fields the spec names replace their template content;
    // the rest of the template is fixed text the organizer wrote.
    drawLine(page, template.heading_content, template.heading_styling, height, regular, bold);
    drawLine(page, template.title_content, template.title_styling, height, regular, bold);
    drawLine(page, fields.recipientName, template.name_styling, height, regular, bold);
    drawLine(
        page,
        // "for attending X" reads oddly for a Winner, so the role leads when it
        // is anything other than the default.
        fields.role && fields.role.toLowerCase() !== "attendee"
            ? `${fields.role} — ${fields.eventTitle}`
            : template.achievement_content || fields.eventTitle,
        template.achievement_styling,
        height,
        regular,
        bold,
    );
    drawLine(page, fields.dateText, template.date_styling, height, regular, bold);
    drawLine(page, template.issuer_name_content, template.issuer_name_styling, height, regular, bold);
    drawLine(page, template.issuer_designation_content, template.issuer_designation_styling, height, regular, bold);

    await drawImage(pdf, page, template.signature_src, template.signature_styling, height);

    // Footer: the id, and where to check it. Small and grey so it does not
    // compete with the certificate, but present -- a certificate nobody can
    // verify is decoration.
    const footer = fields.verifyUrl
        ? `Certificate ID ${fields.certificateId}  ·  Verify at ${fields.verifyUrl}`
        : `Certificate ID ${fields.certificateId}`;
    const footerSize = 7;
    page.drawText(footer, {
        x: (width - regular.widthOfTextAtSize(footer, footerSize)) / 2,
        y: Math.max(borderSize + 6, 10),
        size: footerSize,
        font: regular,
        color: rgb(0.45, 0.45, 0.45),
    });

    return pdf.save();
}
